import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { ListToolsQuery } from './dto/list-tools.query';
import { UpdateToolDto } from './dto/update-tool.dto';
import { AdminKeyGuard } from '../admin/admin-key.guard';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list(@Query() query: ListToolsQuery) {
    return this.tools.list(query);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.tools.getBySlug(slug);
  }

  @Post()
  create(@Body() dto: CreateToolDto) {
    return this.tools.create(dto);
  }

  // ✅ admin protected
  @Patch(':slug')
  @UseGuards(AdminKeyGuard)
  update(@Param('slug') slug: string, @Body() dto: UpdateToolDto) {
    return this.tools.updateBySlug(slug, dto);
  }

  // ✅ admin protected
  @Delete(':slug')
  @UseGuards(AdminKeyGuard)
  remove(@Param('slug') slug: string) {
    return this.tools.deleteBySlug(slug);
  }
}
