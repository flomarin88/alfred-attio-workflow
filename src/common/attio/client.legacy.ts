/**
 * Attio: POST /v2/objects/people/records/query
 * Node 18+ (global fetch). If you're on Node <18, install `undici` and polyfill fetch.
 */

type SortDirection = 'asc' | 'desc'

type SortByAttribute = {
  direction: SortDirection
  attribute: string // slug or attribute id
  field?: string // e.g. "last_name" when sorting by "name"
}

type SortByPath = {
  direction: SortDirection
  path: Array<[string, string]> // e.g. [['sales','parent_record'], ['companies','name']]
  field?: string
}

type PeopleQueryRequest = {
  filter?: Record<string, unknown> // Attio filter DSL (shorthand or verbose)
  sorts?: Array<SortByAttribute | SortByPath>
  limit?: number // default 500
  offset?: number // default 0
}

type AttioRecordId = {
  workspace_id: string // uuid
  object_id: string // uuid
  record_id: string // uuid
}

type AttioRecord = {
  id: AttioRecordId
  created_at: string // ISO datetime string
  web_url: string
  values: Record<string, unknown> // keyed by attribute slug
}

type PeopleQueryResponse = {
  data: AttioRecord[]
}

type GetRecordResponse = {
  data: AttioRecord
}

type AttioErrorResponse = {
  status_code: number
  type: string
  code: string
  message: string
}

class AttioApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly type?: string

  constructor(message: string, status: number, meta?: { code?: string; type?: string }) {
    super(message)
    this.name = 'AttioApiError'
    this.status = status
    this.code = meta?.code
    this.type = meta?.type
  }
}

export class AttioClient {
  private readonly baseUrl: string
  private readonly accessToken: string

  constructor(opts: { accessToken: string; baseUrl?: string }) {
    this.accessToken = opts.accessToken
    this.baseUrl = opts.baseUrl ?? 'https://api.attio.com'
  }

  /**
   * Lists people records with optional filter/sorts/pagination.
   */
  async queryPeople(req: PeopleQueryRequest = {}): Promise<PeopleQueryResponse> {
    const url = `${this.baseUrl}/v2/objects/people/records/query`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(req),
    })

    const text = await res.text()
    const json = text ? (JSON.parse(text) as unknown) : undefined

    if (!res.ok) {
      const err = json as Partial<AttioErrorResponse> | undefined
      throw new AttioApiError(err?.message ?? `Attio API error (${res.status})`, res.status, {
        code: err?.code,
        type: err?.type,
      })
    }

    return json as PeopleQueryResponse
  }

  async getCompany(recordId: string): Promise<GetRecordResponse> {
    const url = `${this.baseUrl}/v2/objects/companies/records/${recordId}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
    })

    const text = await res.text()
    const json = text ? (JSON.parse(text) as unknown) : undefined

    if (!res.ok) {
      const err = json as Partial<AttioErrorResponse> | undefined
      throw new AttioApiError(err?.message ?? `Attio API error (${res.status})`, res.status, {
        code: err?.code,
        type: err?.type,
      })
    }

    return json as GetRecordResponse
  }

  /**
   * Convenience helper to page through all results (offset pagination).
   * Stops when the API returns fewer than `pageSize` records.
   */
  async queryAllPeople(opts: Omit<PeopleQueryRequest, 'limit' | 'offset'> & { pageSize?: number } = {}) {
    const pageSize = opts.pageSize ?? 500
    const out: AttioRecord[] = []
    let offset = 0

    for (;;) {
      const page = await this.queryPeople({
        filter: opts.filter,
        sorts: opts.sorts,
        limit: pageSize,
        offset,
      })

      out.push(...page.data)
      if (page.data.length < pageSize) break
      offset += pageSize
    }

    return out
  }
}
