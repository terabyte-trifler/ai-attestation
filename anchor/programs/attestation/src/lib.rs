use anchor_lang::prelude::*;

declare_id!("21fNgCDmvWAchVyP7eFzaZijaCC8As7RJtuM8SGhv9qr");

#[program]
pub mod attestation {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
