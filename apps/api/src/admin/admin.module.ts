import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';
import { MeiliModule } from '../meili/meili.module';
import { AdminKeyModule } from './admin-key.module';
import { AdminMeiliController } from './admin.meili.controller';

@Module({
  imports: [ToolsModule, MeiliModule, AdminKeyModule],
  controllers: [AdminMeiliController],
})
export class AdminModule {}
