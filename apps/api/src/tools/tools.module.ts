import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeiliModule } from '../meili/meili.module';
import { AdminKeyModule } from '../admin/admin-key.module';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  imports: [PrismaModule, MeiliModule, AdminKeyModule],
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
