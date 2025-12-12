"""
TEXT AI DETECTION SERVICE
==========================
Model: desklib/ai-text-detector-v1.01
Rank: #1 on RAID Benchmark (most accurate!)
Accuracy: 95%+ on detecting AI-generated text

HOW IT WORKS:
1. Text goes in → Model analyzes patterns
2. AI text has different patterns than human text
3. Model outputs probability (0-100%) dfdee
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoConfig, AutoModel, PreTrainedModel
import hashlib


# =====================================================
# STEP 1: Define the Model Architecture
# =====================================================
# 
# The desklib model uses DeBERTa (an improved BERT model)
# We need to define how the model processes text:
#   1. Text → Tokens (words become numbers)
#   2. Tokens → Embeddings (numbers become vectors)  
#   3. Embeddings → Classification (AI or Human?)

class DesklibAIDetector(PreTrainedModel):
    """
    Custom model class for the desklib AI detector.
    
    This wraps the DeBERTa model and adds a classification head
    that outputs: AI probability (0 to 1)
    """
    
    config_class = AutoConfig  # Uses standard config

    def __init__(self, config):
        super().__init__(config)
        
        # The base transformer model (DeBERTa-v3-large)
        # This is the "brain" that understands text
        self.model = AutoModel.from_config(config)
        
        # Classification head - converts embeddings to single number
        # config.hidden_size = 1024 for DeBERTa-large
        # Output = 1 (single probability score)
        self.classifier = nn.Linear(config.hidden_size, 1)
        
        # Initialize weights properly
        self.init_weights()

    def forward(self, input_ids, attention_mask=None, labels=None):
        """
        Forward pass - how data flows through the model
        
        Args:
            input_ids: Tokenized text (numbers representing words)
            attention_mask: Which tokens to pay attention to (1) or ignore (0)
            labels: Optional - for training only
            
        Returns:
            dict with 'logits' (raw prediction score)
        """
        
        # Step 1: Pass through transformer
        # This gives us contextualized embeddings for each token
        outputs = self.model(input_ids, attention_mask=attention_mask)
        last_hidden_state = outputs[0]  # Shape: [batch, seq_len, hidden_size]
        
        # Step 2: Mean Pooling
        # We need ONE vector for the whole text, not per-token
        # So we average all token embeddings (weighted by attention mask)
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
        sum_embeddings = torch.sum(last_hidden_state * input_mask_expanded, dim=1)
        sum_mask = torch.clamp(input_mask_expanded.sum(dim=1), min=1e-9)
        pooled_output = sum_embeddings / sum_mask  # Shape: [batch, hidden_size]
        
        # Step 3: Classification
        # Single linear layer: 1024 dims → 1 dim (probability)
        logits = self.classifier(pooled_output)
        
        return {"logits": logits}


# =====================================================
# STEP 2: Create the Detection Service
# =====================================================

class TextDetectionService:
    """
    Service class to detect AI-generated text.
    
    Usage:
        service = TextDetectionService()
        result = service.detect("Some text to analyze...")
        print(result['ai_probability'])  # e.g., 87.5
    """
    
    # The Hugging Face model ID
    MODEL_NAME = "desklib/ai-text-detector-v1.01"
    
    def __init__(self):
        """Initialize the service (model loaded lazily)"""
        
        # Check if GPU is available (much faster!)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # These will hold our model and tokenizer
        self.tokenizer = None
        self.model = None
        
        # Track if model is loaded
        self._loaded = False
        
        print(f"📝 TextDetectionService initialized (device: {self.device})")
    
    def load(self):
        """
        Load the model from Hugging Face.
        
        This is 'lazy loading' - we only download the model
        when we actually need it (first detection request).
        
        The model is ~1.5GB, so this takes a minute first time.
        """
        if self._loaded:
            return  # Already loaded, skip
        
        print(f"⏳ Loading model: {self.MODEL_NAME}")
        print("   (This downloads ~1.5GB on first run...)")
        
        # Load tokenizer - converts text to numbers
        # Example: "Hello world" → [101, 7592, 2088, 102]
        self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        
        # Load the model weights
        self.model = DesklibAIDetector.from_pretrained(self.MODEL_NAME)
        
        # Move model to GPU if available
        self.model.to(self.device)
        
        # Set to evaluation mode (disables dropout, etc.)
        self.model.eval()
        
        self._loaded = True
        print(f"✅ Model loaded successfully!")
    
    def detect(self, text: str) -> dict:
        """
        Detect if text is AI-generated.
        
        Args:
            text: The text to analyze (min ~50 words for accuracy)
            
        Returns:
            dict with:
                - ai_probability: 0-100 (higher = more likely AI)
                - human_probability: 0-100
                - classification: 'ai', 'human', or 'mixed'
                - confidence: 0-100 (how sure the model is)
                - content_hash: SHA256 hash of the text
        """
        
        # Make sure model is loaded
        self.load()
        
        # Create a unique hash of the content
        # This is used for blockchain attestation later
        content_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
        
        # Tokenize the text
        # - padding: make all sequences same length
        # - truncation: cut off if too long
        # - max_length: 768 tokens max (model limit)
        # - return_tensors: return PyTorch tensors
        encoded = self.tokenizer(
            text,
            padding='max_length',
            truncation=True,
            max_length=768,
            return_tensors='pt'
        )
        
        # Move tensors to GPU/CPU
        input_ids = encoded['input_ids'].to(self.device)
        attention_mask = encoded['attention_mask'].to(self.device)
        
        # Run inference (no gradient calculation needed)
        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids, 
                attention_mask=attention_mask
            )
            
            # Convert logits to probability using sigmoid
            # Logits can be any number, sigmoid squashes to 0-1
            probability = torch.sigmoid(outputs["logits"]).item()
        
        # Convert to percentages
        ai_prob = round(probability * 100, 2)
        human_prob = round((1 - probability) * 100, 2)
        
        # Classify based on thresholds
        if ai_prob > 70:
            classification = "ai"
        elif ai_prob < 30:
            classification = "human"
        else:
            classification = "mixed"
        
        # Confidence = how far from 50% (uncertain)
        confidence = round(abs(probability - 0.5) * 200, 2)
        
        return {
            "content_type": "text",
            "content_hash": content_hash,
            "ai_probability": ai_prob,
            "human_probability": human_prob,
            "classification": classification,
            "confidence": confidence,
            "detection_model": "desklib-v1.01",
            "model_info": "#1 RAID Benchmark"
        }


# =====================================================
# STEP 3: Test the Service
# =====================================================

if __name__ == "__main__":
    # Quick test when running this file directly
    
    service = TextDetectionService()
    
    # Test with obvious AI text
    ai_text = """
    Artificial intelligence has revolutionized numerous industries by enabling 
    machines to perform tasks that traditionally required human intelligence. 
    Machine learning algorithms can analyze vast datasets to identify patterns 
    and make predictions with remarkable accuracy. Natural language processing 
    allows computers to understand and generate human language, facilitating 
    applications such as chatbots and translation services.
    """
    
    # Test with human-like text
    human_text = """
    So yesterday I was walking to the coffee shop and bumped into my old 
    college roommate! Haven't seen him in like 5 years. We grabbed coffee 
    and caught up - turns out he's working at some startup now. Small world, 
    right? Anyway, gotta run to pick up groceries before the store closes.
    """
    
    print("\n" + "="*50)
    print("Testing AI-generated text:")
    print("="*50)
    result1 = service.detect(ai_text)
    print(f"AI Probability: {result1['ai_probability']}%")
    print(f"Classification: {result1['classification']}")
    print(f"Confidence: {result1['confidence']}%")
    
    print("\n" + "="*50)
    print("Testing Human-written text:")
    print("="*50)
    result2 = service.detect(human_text)
    print(f"AI Probability: {result2['ai_probability']}%")
    print(f"Classification: {result2['classification']}")
    print(f"Confidence: {result2['confidence']}%")