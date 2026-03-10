import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class MeiliService {
  private readonly client: MeiliSearch;

  private readonly host: string;
  private readonly apiKey?: string;
  private readonly toolsIndex: string;

  private toolsIndexConfigured = false;

  constructor() {
    this.host = (process.env.MEILI_HOST || 'http://localhost:7700').trim();
    this.apiKey = process.env.MEILI_API_KEY?.trim() || undefined;
    this.toolsIndex = (process.env.MEILI_INDEX_TOOLS || 'tools').trim();

    this.client = new MeiliSearch({
      host: this.host,
      apiKey: this.apiKey,
    });
  }

  getToolsIndexName() {
    return this.toolsIndex;
  }

  private toolsIndexHandle() {
    return this.client.index(this.toolsIndex);
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

      // 🔎 Recherche full-text
      await index.updateSearchableAttributes([
        'name',
        'description',
        'category',
        'countryCode',
        'hostingRegion',
        'gdprLevel',
        'tags', // ✅ nouveau
        'slug',
      ]);

      // 🧩 Filtres / facettes
      await index.updateFilterableAttributes([
        'countryCode',
        'category',
        'hostingRegion',
        'gdprLevel',
        'isOpenSource',
        'tags', // ✅ nouveau (future-proof)
      ]);

      // ↕️ Tri
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
          'tags', // ✅ nouveau
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

  // ✅ RESET complet (supprime l’index, puis il sera recréé à la prochaine indexation)
  async resetToolsIndex() {
    try {
      await this.client.deleteIndex(this.toolsIndex);
      this.toolsIndexConfigured = false;
      return { index: this.toolsIndex, deleted: true };
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (
        msg.toLowerCase().includes('index') &&
        msg.toLowerCase().includes('not found')
      ) {
        this.toolsIndexConfigured = false;
        return { index: this.toolsIndex, deleted: false };
      }

      console.error('[Meili] resetToolsIndex error:', e);
      throw new ServiceUnavailableException('Reset Meili impossible');
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
