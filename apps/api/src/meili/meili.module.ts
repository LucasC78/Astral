import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeiliService } from './meili.service';
import { MeiliSearchController } from './meili.search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MeiliSearchController],
  providers: [MeiliService],
  exports: [MeiliService],
})
export class MeiliModule {}
