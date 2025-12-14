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

// ============================================================
// PROGRAM ID
// ============================================================
// Replace this after running `anchor keys list`
declare_id!("11111111111111111111111111111111");

// ============================================================
// CONSTANTS
// ============================================================

/// Max length for detection model name
pub const MAX_MODEL_NAME_LEN: usize = 32;

/// Max length for metadata URI
pub const MAX_URI_LEN: usize = 200;

/// Max length for content type string
pub const MAX_CONTENT_TYPE_LEN: usize = 20;

/// Seed prefix for attestation PDAs
pub const ATTESTATION_SEED: &[u8] = b"attestation";

/// Seed prefix for config PDA
pub const CONFIG_SEED: &[u8] = b"config";

// ============================================================
// PROGRAM MODULE
// ============================================================

#[program]
pub mod attestation {
    use super::*;

    /// Initialize global program configuration.
    /// Called ONCE when deploying the program.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        config.admin = ctx.accounts.admin.key();
        config.total_attestations = 0;
        config.is_paused = false;
        config.bump = ctx.bumps.config;
        
        msg!("Program initialized! Admin: {}", config.admin);
        
        emit!(ProgramInitialized {
            admin: config.admin,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Create a new content attestation.
    /// Stores AI detection result on-chain.
    pub fn create_attestation(
        ctx: Context<CreateAttestation>,
        content_hash: [u8; 32],
        ai_probability: u16,
        content_type: String,
        detection_model: String,
        metadata_uri: String,
    ) -> Result<()> {
        // ====== INPUT VALIDATION ======
        require!(
            content_hash != [0u8; 32],
            AttestationError::EmptyContentHash
        );
        require!(
            ai_probability <= 10000,
            AttestationError::InvalidProbability
        );
        require!(
            content_type.len() <= MAX_CONTENT_TYPE_LEN,
            AttestationError::ContentTypeTooLong
        );
        require!(
            detection_model.len() <= MAX_MODEL_NAME_LEN,
            AttestationError::ModelNameTooLong
        );
        require!(
            metadata_uri.len() <= MAX_URI_LEN,
            AttestationError::UriTooLong
        );
        
        // ====== POPULATE ATTESTATION ======
        let attestation = &mut ctx.accounts.attestation;
        let clock = Clock::get()?;
        
        attestation.content_hash = content_hash;
        attestation.ai_probability = ai_probability;
        attestation.content_type = content_type.clone();
        attestation.detection_model = detection_model.clone();
        attestation.metadata_uri = metadata_uri;
        attestation.creator = ctx.accounts.creator.key();
        attestation.created_at = clock.unix_timestamp;
        attestation.is_verified = false;
        attestation.verified_by = None;
        attestation.verified_at = None;
        attestation.cnft_asset_id = None;
        attestation.bump = ctx.bumps.attestation;
        attestation.version = 1;
        
        // ====== UPDATE GLOBAL COUNTER ======
        let config = &mut ctx.accounts.config;
        config.total_attestations = config
            .total_attestations
            .checked_add(1)
            .ok_or(AttestationError::Overflow)?;
        
        msg!("Attestation created for content: {:?}", &content_hash[..8]);
        
        emit!(AttestationCreated {
            content_hash,
            ai_probability,
            content_type,
            detection_model,
            creator: ctx.accounts.creator.key(),
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Link a cNFT certificate to an attestation.
    pub fn link_certificate(
        ctx: Context<LinkCertificate>,
        cnft_asset_id: Pubkey,
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        
        require!(
            attestation.cnft_asset_id.is_none(),
            AttestationError::CertificateAlreadyLinked
        );
        
        attestation.cnft_asset_id = Some(cnft_asset_id);
        
        msg!("Certificate linked: {}", cnft_asset_id);
        
        emit!(CertificateLinked {
            content_hash: attestation.content_hash,
            cnft_asset_id,
            creator: ctx.accounts.creator.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Mark an attestation as verified by admin.
    pub fn verify_attestation(ctx: Context<VerifyAttestation>) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        let clock = Clock::get()?;
        
        require!(
            !attestation.is_verified,
            AttestationError::AlreadyVerified
        );
        
        attestation.is_verified = true;
        attestation.verified_by = Some(ctx.accounts.authority.key());
        attestation.verified_at = Some(clock.unix_timestamp);
        
        msg!("Attestation verified by: {}", ctx.accounts.authority.key());
        
        emit!(AttestationVerified {
            content_hash: attestation.content_hash,
            verified_by: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Update the metadata URI of an attestation.
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        new_metadata_uri: String,
    ) -> Result<()> {
        require!(
            new_metadata_uri.len() <= MAX_URI_LEN,
            AttestationError::UriTooLong
        );
        
        let attestation = &mut ctx.accounts.attestation;
        attestation.metadata_uri = new_metadata_uri.clone();
        
        msg!("Metadata updated: {}", new_metadata_uri);
        
        emit!(MetadataUpdated {
            content_hash: attestation.content_hash,
            new_uri: new_metadata_uri,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Close an attestation and reclaim rent.
    pub fn close_attestation(ctx: Context<CloseAttestation>) -> Result<()> {
        msg!(
            "Attestation closed: {:?}",
            &ctx.accounts.attestation.content_hash[..8]
        );
        
        emit!(AttestationClosed {
            content_hash: ctx.accounts.attestation.content_hash,
            creator: ctx.accounts.creator.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Pause or unpause the program (admin only).
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.is_paused = paused;
        msg!("Program paused: {}", paused);
        Ok(())
    }

    /// Transfer admin role to a new address.
    pub fn transfer_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let old_admin = config.admin;
        config.admin = new_admin;
        msg!("Admin transferred from {} to {}", old_admin, new_admin);
        Ok(())
    }
}

// ============================================================
// ACCOUNT STRUCTURES
// ============================================================

/// Program configuration (global state)
#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub total_attestations: u64,
    pub is_paused: bool,
    pub bump: u8,
}

/// Content attestation (main data structure)
#[account]
#[derive(InitSpace)]
pub struct Attestation {
    /// SHA-256 hash of the content
    pub content_hash: [u8; 32],
    
    /// AI probability (0-10000 basis points)
    pub ai_probability: u16,
    
    /// Content type: "text", "image", "deepfake"
    #[max_len(20)]
    pub content_type: String,
    
    /// Detection model used
    #[max_len(32)]
    pub detection_model: String,
    
    /// Metadata URI (IPFS/Arweave)
    #[max_len(200)]
    pub metadata_uri: String,
    
    /// Creator's pubkey
    pub creator: Pubkey,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Verification status
    pub is_verified: bool,
    pub verified_by: Option<Pubkey>,
    pub verified_at: Option<i64>,
    
    /// Linked cNFT certificate
    pub cnft_asset_id: Option<Pubkey>,
    
    /// PDA bump
    pub bump: u8,
    
    /// Schema version
    pub version: u8,
}

// ============================================================
// ACCOUNT VALIDATION CONTEXTS
// ============================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct CreateAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + Attestation::INIT_SPACE,
        seeds = [ATTESTATION_SEED, content_hash.as_ref()],
        bump
    )]
    pub attestation: Account<'info, Attestation>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.is_paused @ AttestationError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkCertificate<'info> {
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        has_one = creator @ AttestationError::Unauthorized,
        seeds = [ATTESTATION_SEED, attestation.content_hash.as_ref()],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,
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
        bump = config.bump,
        constraint = config.admin == authority.key() @ AttestationError::Unauthorized
    )]
    pub config: Account<'info, ProgramConfig>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        has_one = creator @ AttestationError::Unauthorized,
        seeds = [ATTESTATION_SEED, attestation.content_hash.as_ref()],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct CloseAttestation<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        has_one = creator @ AttestationError::Unauthorized,
        seeds = [ATTESTATION_SEED, attestation.content_hash.as_ref()],
        bump = attestation.bump,
        close = creator
    )]
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ AttestationError::Unauthorized
    )]
    pub config: Account<'info, ProgramConfig>,
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
pub struct AttestationCreated {
    pub content_hash: [u8; 32],
    pub ai_probability: u16,
    pub content_type: String,
    pub detection_model: String,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CertificateLinked {
    pub content_hash: [u8; 32],
    pub cnft_asset_id: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AttestationVerified {
    pub content_hash: [u8; 32],
    pub verified_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MetadataUpdated {
    pub content_hash: [u8; 32],
    pub new_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct AttestationClosed {
    pub content_hash: [u8; 32],
    pub creator: Pubkey,
    pub timestamp: i64,
}

// ============================================================
// ERRORS
// ============================================================

#[error_code]
pub enum AttestationError {
    #[msg("AI probability must be between 0 and 10000")]
    InvalidProbability,
    
    #[msg("Content type string too long (max 20 chars)")]
    ContentTypeTooLong,
    
    #[msg("Detection model name too long (max 32 chars)")]
    ModelNameTooLong,
    
    #[msg("Metadata URI too long (max 200 chars)")]
    UriTooLong,
    
    #[msg("Content hash cannot be empty")]
    EmptyContentHash,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Certificate already linked")]
    CertificateAlreadyLinked,
    
    #[msg("Already verified")]
    AlreadyVerified,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Arithmetic overflow")]
    Overflow,
}