import { Module } from '@nestjs/common';
import { AdminKeyGuard } from './admin-key.guard';

@Module({
  providers: [AdminKeyGuard],
  exports: [AdminKeyGuard],
})
export class AdminKeyModule {}
