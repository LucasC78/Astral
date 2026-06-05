import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class MeiliService {
  private readonly client: MeiliSearch;

  private readonly host: string;
  private readonly apiKey?: string;
  private readonly toolsIndex: string;
  private readonly pagesIndex: string;

  private toolsIndexConfigured = false;
  private pagesIndexConfigured = false;

  constructor() {
    this.host = (process.env.MEILI_HOST || 'http://localhost:7700').trim();
    this.apiKey = process.env.MEILI_API_KEY?.trim() || undefined;
    this.toolsIndex = (process.env.MEILI_INDEX_TOOLS || 'tools').trim();
    this.pagesIndex = (process.env.MEILI_INDEX_PAGES || 'pages').trim();

    this.client = new MeiliSearch({
      host: this.host,
      apiKey: this.apiKey,
    });
  }

  getToolsIndexName() {
    return this.toolsIndex;
  }

  getPagesIndexName() {
    return this.pagesIndex;
  }

  private toolsIndexHandle() {
    return this.client.index(this.toolsIndex);
  }

  private pagesIndexHandle() {
    return this.client.index(this.pagesIndex);
  }

  async health() {
    try {
      return await this.client.health();
    } catch (e) {
      console.error('[Meili] health error:', e);
      throw new ServiceUnavailableException('Meilisearch indisponible');
    }
  }

  async configureToolsIndex(force = false) {
    if (this.toolsIndexConfigured && !force) return;

    try {
      const index = this.toolsIndexHandle();

      await index.updateSearchableAttributes([
        'name',
        'description',
        'category',
        'countryCode',
        'hostingRegion',
        'gdprLevel',
        'tags',
        'slug',
        'websiteUrl',
        'logoUrl',
      ]);

      await index.updateFilterableAttributes([
        'countryCode',
        'category',
        'hostingRegion',
        'gdprLevel',
        'isOpenSource',
        'tags',
      ]);

      await index.updateSortableAttributes(['createdAt', 'updatedAt', 'name']);

      this.toolsIndexConfigured = true;
    } catch (e) {
      console.error('[Meili] configureToolsIndex error:', e);
      throw new ServiceUnavailableException('Configuration Meili impossible');
    }
  }

  async indexTools(documents: Array<Record<string, any>>) {
    try {
      const index = this.toolsIndexHandle();
      return await index.addDocuments(documents, { primaryKey: 'id' });
    } catch (e) {
      console.error('[Meili] indexTools error:', e);
      throw new ServiceUnavailableException('Indexation Meili impossible');
    }
  }

  async deleteTool(id: number) {
    try {
      const index = this.toolsIndexHandle();
      return await index.deleteDocument(id);
    } catch (e) {
      console.error('[Meili] deleteTool error:', e);
      throw new ServiceUnavailableException('Suppression Meili impossible');
    }
  }

  async searchTools(
    q: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string;
      facets?: string[];
    },
  ) {
    try {
      const index = this.toolsIndexHandle();

      return await index.search(q, {
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
        filter: options?.filter,
        sort: options?.sort ? [options.sort] : undefined,
        facets: options?.facets,
      });
    } catch (e) {
      console.error('[Meili] searchTools error:', e);
      throw new ServiceUnavailableException('Recherche Meili impossible');
    }
  }

  async getToolsFacets() {
    try {
      const index = this.toolsIndexHandle();

      const res = await index.search('', {
        limit: 0,
        facets: [
          'countryCode',
          'category',
          'hostingRegion',
          'gdprLevel',
          'isOpenSource',
          'tags',
        ],
      });

      return {
        index: this.toolsIndex,
        facetDistribution: res.facetDistribution ?? {},
        facetStats: res.facetStats ?? {},
      };
    } catch (e) {
      console.error('[Meili] getToolsFacets error:', e);
      throw new ServiceUnavailableException('Facettes Meili impossibles');
    }
  }

  async resetToolsIndex() {
    try {
      await this.client.deleteIndex(this.toolsIndex);
      this.toolsIndexConfigured = false;

      return {
        index: this.toolsIndex,
        deleted: true,
      };
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();

      if (msg.includes('index') && msg.includes('not found')) {
        this.toolsIndexConfigured = false;

        return {
          index: this.toolsIndex,
          deleted: false,
        };
      }

      console.error('[Meili] resetToolsIndex error:', e);
      throw new ServiceUnavailableException('Reset Meili impossible');
    }
  }

  async configurePagesIndex(force = false) {
    if (this.pagesIndexConfigured && !force) return;

    try {
      const index = this.pagesIndexHandle();

      await index.updateSearchableAttributes([
        'title',
        'description',
        'content',
        'url',
        'toolName',
        'toolSlug',
        'toolCategory',
        'toolCountryCode',
        'toolTags',
      ]);

      await index.updateFilterableAttributes([
        'toolId',
        'toolSlug',
        'toolCategory',
        'toolCountryCode',
        'toolTags',
      ]);

      await index.updateSortableAttributes(['createdAt', 'updatedAt', 'title']);

      this.pagesIndexConfigured = true;
    } catch (e) {
      console.error('[Meili] configurePagesIndex error:', e);
      throw new ServiceUnavailableException(
        'Configuration Meili pages impossible',
      );
    }
  }

  async indexPages(documents: Array<Record<string, any>>) {
    try {
      const index = this.pagesIndexHandle();
      return await index.addDocuments(documents, { primaryKey: 'id' });
    } catch (e) {
      console.error('[Meili] indexPages error:', e);
      throw new ServiceUnavailableException(
        'Indexation Meili pages impossible',
      );
    }
  }

  async searchPages(
    q: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string;
    },
  ) {
    try {
      const index = this.pagesIndexHandle();

      return await index.search(q, {
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
        filter: options?.filter,
        sort: options?.sort ? [options.sort] : undefined,
      });
    } catch (e) {
      console.error('[Meili] searchPages error:', e);
      throw new ServiceUnavailableException('Recherche Meili pages impossible');
    }
  }

  async resetPagesIndex() {
    try {
      await this.client.deleteIndex(this.pagesIndex);
      this.pagesIndexConfigured = false;

      return {
        index: this.pagesIndex,
        deleted: true,
      };
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();

      if (msg.includes('index') && msg.includes('not found')) {
        this.pagesIndexConfigured = false;

        return {
          index: this.pagesIndex,
          deleted: false,
        };
      }

      console.error('[Meili] resetPagesIndex error:', e);
      throw new ServiceUnavailableException('Reset Meili pages impossible');
    }
  }

  async getTask(taskUid: number) {
    try {
      return await this.client.getTask(taskUid);
    } catch (e) {
      console.error('[Meili] getTask error:', e);
      throw new ServiceUnavailableException('Task Meili inaccessible');
    }
  }
}
