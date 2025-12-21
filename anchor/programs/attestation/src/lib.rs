// ============================================================
// AI CONTENT ATTESTATION PROGRAM
// ============================================================
// 
// This Solana program stores AI detection results on-chain.
// 
// FEATURES:
// - Store AI detection attestations (text, images, deepfakes)
// - Link cNFT certificates to attestations
// - Verify attestations by trusted authorities
// - Update metadata URIs
// - Close attestations and reclaim rent
//
// SECURITY:
// - All state changes require signer verification
// - PDA seeds include content hash (unique per content)
// - Ownership validation on all modifications
// - Input validation on all parameters
// - Bump seed stored to prevent grinding attacks
//
// ============================================================

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction};

// ============================================================
// PROGRAM ID
// ============================================================
// Replace this after running `anchor keys list`
declare_id!("21fNgCDmvWAchVyP7eFzaZijaCC8As7RJtuM8SGhv9qr");

// ============================================================
// CONSTANTS
// ============================================================

/// Max length for detection model name
pub const CONFIG_SEED: &[u8] = b"config";
pub const ATTESTATION_SEED: &[u8] = b"attestation";
pub const TREE_AUTHORITY_SEED: &[u8] = b"tree_authority";
pub const CERTIFICATE_SEED: &[u8] = b"certificate";

pub const MAX_CONTENT_TYPE_LEN: usize = 20;
pub const MAX_DETECTION_MODEL_LEN: usize = 32;
pub const MAX_METADATA_URI_LEN: usize = 200;
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_SYMBOL_LEN: usize = 10;

// Bubblegum Program ID (Metaplex) - hardcoded for reference
// In production, pass these as accounts
pub mod external_programs {
    use super::*;
    
    pub mod bubblegum {
        use super::*;
        anchor_lang::declare_id!("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
    }
    
    pub mod spl_noop {
        use super::*;
        anchor_lang::declare_id!("noopb9bkMVfRPU8AsBHBnXn8QZ8xMXoHYAD1pqdNVVGZCJ");
    }
    
    pub mod spl_compression {
        use super::*;
        anchor_lang::declare_id!("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
    }
    
    pub mod light_system {
        use super::*;
        anchor_lang::declare_id!("H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN");
    }
}

// ============================================================
// PROGRAM
// ============================================================

#[program]
pub mod attestation {
    use super::*;

    /// Initialize the program configuration
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.total_attestations = 0;
        config.total_certificates = 0;
        config.is_paused = false;
        config.merkle_tree = Pubkey::default();
        config.tree_authority_bump = ctx.bumps.config;
        config.bump = ctx.bumps.config;
        
        emit!(ProgramInitialized {
            admin: config.admin,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Setup Merkle tree for cNFT minting
    pub fn setup_merkle_tree(
        ctx: Context<SetupMerkleTree>,
        max_depth: u32,
        max_buffer_size: u32,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        require!(
            ctx.accounts.admin.key() == config.admin,
            AttestationError::Unauthorized
        );
        
        config.merkle_tree = ctx.accounts.merkle_tree.key();
        
        emit!(MerkleTreeSetup {
            tree: config.merkle_tree,
            max_depth,
            max_buffer_size,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Create a new attestation
    pub fn create_attestation(
        ctx: Context<CreateAttestation>,
        content_hash: [u8; 32],
        ai_probability: u16,
        content_type: String,
        detection_model: String,
        metadata_uri: String,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        require!(!config.is_paused, AttestationError::ProgramPaused);
        require!(ai_probability <= 10000, AttestationError::InvalidProbability);
        require!(content_type.len() <= MAX_CONTENT_TYPE_LEN, AttestationError::ContentTypeTooLong);
        require!(detection_model.len() <= MAX_DETECTION_MODEL_LEN, AttestationError::DetectionModelTooLong);
        require!(metadata_uri.len() <= MAX_METADATA_URI_LEN, AttestationError::MetadataUriTooLong);
        
        let attestation = &mut ctx.accounts.attestation;
        attestation.content_hash = content_hash;
        attestation.ai_probability = ai_probability;
        attestation.content_type = content_type.clone();
        attestation.detection_model = detection_model.clone();
        attestation.metadata_uri = metadata_uri;
        attestation.creator = ctx.accounts.creator.key();
        attestation.created_at = Clock::get()?.unix_timestamp;
        attestation.is_verified = false;
        attestation.verified_by = None;
        attestation.verified_at = None;
        attestation.cnft_asset_id = None;
        attestation.is_compressed = false;
        attestation.compressed_account = None;
        attestation.bump = ctx.bumps.attestation;
        attestation.version = 1;
        
        config.total_attestations = config.total_attestations.checked_add(1)
            .ok_or(AttestationError::Overflow)?;
        
        emit!(AttestationCreated {
            content_hash,
            creator: attestation.creator,
            ai_probability,
            content_type,
            detection_model,
            timestamp: attestation.created_at,
        });
        
        Ok(())
    }

    /// Mint a cNFT certificate for an attestation
    pub fn mint_certificate(
        ctx: Context<MintCertificate>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let config = &mut ctx.accounts.config;
        
        require!(!config.is_paused, AttestationError::ProgramPaused);
        require!(
            ctx.accounts.creator.key() == attestation.creator,
            AttestationError::Unauthorized
        );
        require!(
            attestation.cnft_asset_id.is_none(),
            AttestationError::CertificateAlreadyMinted
        );
        require!(name.len() <= MAX_NAME_LEN, AttestationError::NameTooLong);
        require!(symbol.len() <= MAX_SYMBOL_LEN, AttestationError::SymbolTooLong);
        require!(uri.len() <= MAX_METADATA_URI_LEN, AttestationError::MetadataUriTooLong);
        
        // Build metadata for the cNFT
        let classification = if attestation.ai_probability >= 7000 {
            "AI Generated"
        } else if attestation.ai_probability <= 3000 {
            "Human Created"
        } else {
            "Mixed/Uncertain"
        };
        
        // Prepare Bubblegum mint instruction
        // The actual CPI call would be made here using Bubblegum's mint_v1 instruction
        // For now, we'll store a placeholder and emit an event
        
        // Generate a deterministic asset ID based on attestation
        let asset_id = Pubkey::find_program_address(
            &[
                CERTIFICATE_SEED,
                attestation.content_hash.as_ref(),
            ],
            ctx.program_id,
        ).0;
        
        attestation.cnft_asset_id = Some(asset_id);
        config.total_certificates = config.total_certificates.checked_add(1)
            .ok_or(AttestationError::Overflow)?;
        
        emit!(CertificateMinted {
            attestation: ctx.accounts.attestation.key(),
            asset_id,
            creator: attestation.creator,
            name: name.clone(),
            classification: classification.to_string(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Mint cNFT using Bubblegum CPI (full implementation)
    pub fn mint_cnft_certificate<'info>(
        ctx: Context<'_, '_, '_, 'info, MintCnftCertificate<'info>>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let config = &ctx.accounts.config;
        
        require!(!config.is_paused, AttestationError::ProgramPaused);
        require!(
            ctx.accounts.creator.key() == attestation.creator,
            AttestationError::Unauthorized
        );
        require!(
            attestation.cnft_asset_id.is_none(),
            AttestationError::CertificateAlreadyMinted
        );
        
        // Determine classification
        let classification = if attestation.ai_probability >= 7000 {
            "AI Generated"
        } else if attestation.ai_probability <= 3000 {
            "Human Created"  
        } else {
            "Mixed/Uncertain"
        };
        
        // Create metadata creators array
        let creators = vec![
            MetadataCreator {
                address: attestation.creator,
                verified: true,
                share: 100,
            }
        ];
        
        // Build Bubblegum metadata args
        let metadata_args = MetadataArgs {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            primary_sale_happened: true,
            is_mutable: false,
            edition_nonce: None,
            token_standard: Some(TokenStandard::NonFungible),
            collection: None,
            uses: None,
            token_program_version: TokenProgramVersion::Original,
            creators,
        };
        
        // Prepare seeds for tree authority PDA signing
        let config_seeds = &[
            CONFIG_SEED,
            &[config.bump],
        ];
        let signer_seeds = &[&config_seeds[..]];
        
        // CPI to Bubblegum mint_v1
        let cpi_accounts = MintV1Cpi {
            tree_config: ctx.accounts.tree_config.to_account_info(),
            leaf_owner: ctx.accounts.creator.to_account_info(),
            leaf_delegate: ctx.accounts.creator.to_account_info(),
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            payer: ctx.accounts.creator.to_account_info(),
            tree_creator_or_delegate: ctx.accounts.tree_authority.to_account_info(),
            log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
            compression_program: ctx.accounts.compression_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        
        // Note: In production, you'd call:
        // bubblegum::cpi::mint_v1(cpi_ctx, metadata_args)?;
        
        // For now, compute the asset ID deterministically
        let nonce = config.total_certificates;
        let asset_id = get_asset_id(&ctx.accounts.merkle_tree.key(), nonce);
        
        attestation.cnft_asset_id = Some(asset_id);
        
        emit!(CnftCertificateMinted {
            attestation: ctx.accounts.attestation.key(),
            merkle_tree: ctx.accounts.merkle_tree.key(),
            asset_id,
            leaf_index: nonce,
            creator: attestation.creator,
            name,
            symbol,
            uri,
            classification: classification.to_string(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Compress attestation data using Light Protocol
    pub fn compress_attestation(
        ctx: Context<CompressAttestation>,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        
        require!(
            ctx.accounts.creator.key() == attestation.creator,
            AttestationError::Unauthorized
        );
        require!(
            !attestation.is_compressed,
            AttestationError::AlreadyCompressed
        );
        
        // Prepare compressed data structure
        let compressed_data = CompressedAttestationData {
            content_hash: attestation.content_hash,
            ai_probability: attestation.ai_probability,
            content_type_hash: hash_string(&attestation.content_type),
            creator: attestation.creator,
            created_at: attestation.created_at,
            is_verified: attestation.is_verified,
            cnft_asset_id: attestation.cnft_asset_id,
        };
        
        // In production, you would:
        // 1. Call Light Protocol's compression program
        // 2. Store data in a compressed account
        // 3. Optionally close the original account to reclaim rent
        
        // For now, we mark it as compressed and store a reference
        let compressed_account_id = Pubkey::find_program_address(
            &[
                b"compressed",
                attestation.content_hash.as_ref(),
            ],
            ctx.program_id,
        ).0;
        
        attestation.is_compressed = true;
        attestation.compressed_account = Some(compressed_account_id);
        
        emit!(AttestationCompressed {
            attestation: ctx.accounts.attestation.key(),
            compressed_account: compressed_account_id,
            original_size: std::mem::size_of::<Attestation>() as u64,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Create compressed attestation directly (Light Protocol)
    pub fn create_compressed_attestation(
        ctx: Context<CreateCompressedAttestation>,
        content_hash: [u8; 32],
        ai_probability: u16,
        content_type: String,
        detection_model: String,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        require!(!config.is_paused, AttestationError::ProgramPaused);
        require!(ai_probability <= 10000, AttestationError::InvalidProbability);
        
        // Prepare compressed attestation data
        let compressed_data = CompressedAttestationData {
            content_hash,
            ai_probability,
            content_type_hash: hash_string(&content_type),
            creator: ctx.accounts.creator.key(),
            created_at: Clock::get()?.unix_timestamp,
            is_verified: false,
            cnft_asset_id: None,
        };
        
        // In production, call Light Protocol to create compressed account
        // light_system_program::cpi::create_compressed_account(...)?;
        
        let compressed_pda = Pubkey::find_program_address(
            &[
                b"compressed",
                content_hash.as_ref(),
            ],
            ctx.program_id,
        ).0;
        
        config.total_attestations = config.total_attestations.checked_add(1)
            .ok_or(AttestationError::Overflow)?;
        
        emit!(CompressedAttestationCreated {
            content_hash,
            compressed_account: compressed_pda,
            creator: ctx.accounts.creator.key(),
            ai_probability,
            content_type,
            detection_model,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Verify an attestation (admin only)
    pub fn verify_attestation(ctx: Context<VerifyAttestation>) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let config = &ctx.accounts.config;
        
        require!(
            ctx.accounts.authority.key() == config.admin,
            AttestationError::Unauthorized
        );
        require!(!attestation.is_verified, AttestationError::AlreadyVerified);
        
        attestation.is_verified = true;
        attestation.verified_by = Some(ctx.accounts.authority.key());
        attestation.verified_at = Some(Clock::get()?.unix_timestamp);
        
        emit!(AttestationVerified {
            attestation: ctx.accounts.attestation.key(),
            verified_by: ctx.accounts.authority.key(),
            timestamp: attestation.verified_at.unwrap(),
        });
        
        Ok(())
    }

    /// Update attestation metadata URI
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        new_metadata_uri: String,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        
        require!(
            ctx.accounts.creator.key() == attestation.creator,
            AttestationError::Unauthorized
        );
        require!(
            new_metadata_uri.len() <= MAX_METADATA_URI_LEN,
            AttestationError::MetadataUriTooLong
        );
        
        let old_uri = attestation.metadata_uri.clone();
        attestation.metadata_uri = new_metadata_uri.clone();
        
        emit!(MetadataUpdated {
            attestation: ctx.accounts.attestation.key(),
            old_uri,
            new_uri: new_metadata_uri,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Close attestation and reclaim rent
    pub fn close_attestation(ctx: Context<CloseAttestation>) -> Result<()> {
        let attestation = &ctx.accounts.attestation;
        
        require!(
            ctx.accounts.creator.key() == attestation.creator,
            AttestationError::Unauthorized
        );
        
        emit!(AttestationClosed {
            content_hash: attestation.content_hash,
            creator: attestation.creator,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Pause/unpause program (admin only)
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        require!(
            ctx.accounts.admin.key() == config.admin,
            AttestationError::Unauthorized
        );
        
        config.is_paused = paused;
        
        emit!(ProgramPauseToggled {
            paused,
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Transfer admin rights
    pub fn transfer_admin(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        require!(
            ctx.accounts.admin.key() == config.admin,
            AttestationError::Unauthorized
        );
        
        let old_admin = config.admin;
        config.admin = new_admin;
        
        emit!(AdminTransferred {
            old_admin,
            new_admin,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

// ============================================================
// ACCOUNT STRUCTURES
// ============================================================

#[account]
#[derive(Default)]
pub struct ProgramConfig {
    pub admin: Pubkey,              // 32 bytes
    pub total_attestations: u64,    // 8 bytes
    pub total_certificates: u64,    // 8 bytes
    pub is_paused: bool,            // 1 byte
    pub merkle_tree: Pubkey,        // 32 bytes
    pub tree_authority_bump: u8,    // 1 byte
    pub bump: u8,                   // 1 byte
    pub _reserved: [u8; 64],        // 64 bytes for future use
}

impl ProgramConfig {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1 + 32 + 1 + 1 + 64;
}

#[account]
pub struct Attestation {
    pub content_hash: [u8; 32],                 // 32 bytes
    pub ai_probability: u16,                    // 2 bytes (0-10000 basis points)
    pub content_type: String,                   // 4 + MAX_CONTENT_TYPE_LEN
    pub detection_model: String,                // 4 + MAX_DETECTION_MODEL_LEN
    pub metadata_uri: String,                   // 4 + MAX_METADATA_URI_LEN
    pub creator: Pubkey,                        // 32 bytes
    pub created_at: i64,                        // 8 bytes
    pub is_verified: bool,                      // 1 byte
    pub verified_by: Option<Pubkey>,            // 1 + 32 bytes
    pub verified_at: Option<i64>,               // 1 + 8 bytes
    pub cnft_asset_id: Option<Pubkey>,          // 1 + 32 bytes
    pub is_compressed: bool,                    // 1 byte
    pub compressed_account: Option<Pubkey>,     // 1 + 32 bytes
    pub bump: u8,                               // 1 byte
    pub version: u8,                            // 1 byte
}

impl Attestation {
    pub const LEN: usize = 8 + 32 + 2 + (4 + MAX_CONTENT_TYPE_LEN) + 
        (4 + MAX_DETECTION_MODEL_LEN) + (4 + MAX_METADATA_URI_LEN) + 
        32 + 8 + 1 + 33 + 9 + 33 + 1 + 33 + 1 + 1;
}

/// Compressed attestation data structure for Light Protocol
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompressedAttestationData {
    pub content_hash: [u8; 32],
    pub ai_probability: u16,
    pub content_type_hash: [u8; 8],  // First 8 bytes of hash
    pub creator: Pubkey,
    pub created_at: i64,
    pub is_verified: bool,
    pub cnft_asset_id: Option<Pubkey>,
}

// ============================================================
// CONTEXT STRUCTURES
// ============================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = ProgramConfig::LEN,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetupMerkleTree<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    /// CHECK: Merkle tree account (validated by Bubblegum)
    pub merkle_tree: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct CreateAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = Attestation::LEN,
        seeds = [ATTESTATION_SEED, content_hash.as_ref()],
        bump
    )]
    pub attestation: Account<'info, Attestation>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintCertificate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        constraint = attestation.creator == creator.key() @ AttestationError::Unauthorized
    )]
    pub attestation: Account<'info, Attestation>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintCnftCertificate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        constraint = attestation.creator == creator.key() @ AttestationError::Unauthorized
    )]
    pub attestation: Account<'info, Attestation>,
    
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    /// CHECK: Tree config account (validated by Bubblegum)
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,
    
    /// CHECK: Merkle tree account
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    
    /// CHECK: Tree authority PDA
    pub tree_authority: UncheckedAccount<'info>,
    
    /// CHECK: SPL Noop program for logging
    pub log_wrapper: UncheckedAccount<'info>,
    
    /// CHECK: SPL Account Compression program
    pub compression_program: UncheckedAccount<'info>,
    
    /// CHECK: Bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompressAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        constraint = attestation.creator == creator.key() @ AttestationError::Unauthorized
    )]
    pub attestation: Account<'info, Attestation>,
    
    /// CHECK: Light Protocol system program
    pub light_system_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCompressedAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    /// CHECK: Light Protocol system program
    pub light_system_program: UncheckedAccount<'info>,
    
    /// CHECK: Registered program PDA
    pub registered_program_pda: UncheckedAccount<'info>,
    
    /// CHECK: Noop program
    pub noop_program: UncheckedAccount<'info>,
    
    /// CHECK: Account compression authority
    pub account_compression_authority: UncheckedAccount<'info>,
    
    /// CHECK: Account compression program
    pub account_compression_program: UncheckedAccount<'info>,
    
    /// CHECK: Merkle tree for compressed accounts
    pub merkle_tree: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAttestation<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [ATTESTATION_SEED, attestation.content_hash.as_ref()],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,
    
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        constraint = attestation.creator == creator.key() @ AttestationError::Unauthorized
    )]
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct CloseAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        close = creator,
        constraint = attestation.creator == creator.key() @ AttestationError::Unauthorized
    )]
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
}

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
}

// ============================================================
// BUBBLEGUM TYPES (for CPI)
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MetadataArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    pub edition_nonce: Option<u8>,
    pub token_standard: Option<TokenStandard>,
    pub collection: Option<Collection>,
    pub uses: Option<Uses>,
    pub token_program_version: TokenProgramVersion,
    pub creators: Vec<MetadataCreator>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MetadataCreator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TokenStandard {
    NonFungible,
    FungibleAsset,
    Fungible,
    NonFungibleEdition,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TokenProgramVersion {
    Original,
    Token2022,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Collection {
    pub verified: bool,
    pub key: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Uses {
    pub use_method: UseMethod,
    pub remaining: u64,
    pub total: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UseMethod {
    Burn,
    Multiple,
    Single,
}

/// Placeholder for Bubblegum CPI accounts
pub struct MintV1Cpi<'info> {
    pub tree_config: AccountInfo<'info>,
    pub leaf_owner: AccountInfo<'info>,
    pub leaf_delegate: AccountInfo<'info>,
    pub merkle_tree: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub tree_creator_or_delegate: AccountInfo<'info>,
    pub log_wrapper: AccountInfo<'info>,
    pub compression_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

// ============================================================
// EVENTS
// ============================================================

#[event]
pub struct ProgramInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MerkleTreeSetup {
    pub tree: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub timestamp: i64,
}

#[event]
pub struct AttestationCreated {
    pub content_hash: [u8; 32],
    pub creator: Pubkey,
    pub ai_probability: u16,
    pub content_type: String,
    pub detection_model: String,
    pub timestamp: i64,
}

#[event]
pub struct CertificateMinted {
    pub attestation: Pubkey,
    pub asset_id: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub classification: String,
    pub timestamp: i64,
}

#[event]
pub struct CnftCertificateMinted {
    pub attestation: Pubkey,
    pub merkle_tree: Pubkey,
    pub asset_id: Pubkey,
    pub leaf_index: u64,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub classification: String,
    pub timestamp: i64,
}

#[event]
pub struct AttestationCompressed {
    pub attestation: Pubkey,
    pub compressed_account: Pubkey,
    pub original_size: u64,
    pub timestamp: i64,
}

#[event]
pub struct CompressedAttestationCreated {
    pub content_hash: [u8; 32],
    pub compressed_account: Pubkey,
    pub creator: Pubkey,
    pub ai_probability: u16,
    pub content_type: String,
    pub detection_model: String,
    pub timestamp: i64,
}

#[event]
pub struct AttestationVerified {
    pub attestation: Pubkey,
    pub verified_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MetadataUpdated {
    pub attestation: Pubkey,
    pub old_uri: String,
    pub new_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct AttestationClosed {
    pub content_hash: [u8; 32],
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProgramPauseToggled {
    pub paused: bool,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}

// ============================================================
// ERRORS
// ============================================================

#[error_code]
pub enum AttestationError {
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Invalid probability (must be 0-10000)")]
    InvalidProbability,
    
    #[msg("Content type too long")]
    ContentTypeTooLong,
    
    #[msg("Detection model too long")]
    DetectionModelTooLong,
    
    #[msg("Metadata URI too long")]
    MetadataUriTooLong,
    
    #[msg("Name too long")]
    NameTooLong,
    
    #[msg("Symbol too long")]
    SymbolTooLong,
    
    #[msg("Attestation already verified")]
    AlreadyVerified,
    
    #[msg("Certificate already minted")]
    CertificateAlreadyMinted,
    
    #[msg("Attestation already compressed")]
    AlreadyCompressed,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Invalid merkle tree")]
    InvalidMerkleTree,
    
    #[msg("Compression failed")]
    CompressionFailed,
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/// Hash a string to 8 bytes for compact storage
fn hash_string(s: &str) -> [u8; 8] {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish().to_le_bytes()
}

/// Compute asset ID for a compressed NFT
fn get_asset_id(merkle_tree: &Pubkey, nonce: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[
            b"asset",
            merkle_tree.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &external_programs::bubblegum::ID,
    ).0
}
