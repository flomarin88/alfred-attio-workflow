import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client.legacy'
import { Variables } from '@common/variables.enum'

type CompanyMap = Record<string, string>

async function fetchCompaniesMap(attioClient: AttioClient, companyIds: Set<string>): Promise<CompanyMap> {
  const entries = await Promise.all(
    [...companyIds].map(async (id) => {
      try {
        const companyRecord = await attioClient.getCompany(id)
        const companyNameValues = companyRecord.data.values['name'] as Array<{ value?: string }> | undefined
        const name = companyNameValues?.[0]?.value ?? '(no company)'
        return [id, name] as const
      } catch {
        return [id, '(company fetch error)'] as const
      }
    }),
  )

  return Object.fromEntries(entries)
}

;(async () => {
  const COMPANY_TTL = 24 * 60 * 60 * 1000 // 24h
  const PEOPLE_TTL = 10 * 60 * 1000 // 10 min

  const alfredClient = new FastAlfred()

  try {
    const attioApiKey: string | undefined = alfredClient.env.getEnv(Variables.API_KEY, {
      defaultValue: process.env.API_KEY,
    })
    if (!attioApiKey) throw new Error('Attio API Key is required')

    const attioClient = new AttioClient({ accessToken: attioApiKey })

    const q = alfredClient.input?.trim()
    const filterExpression = q
      ? {
          $or: [
            { name: { full_name: { $contains: q } } },
            { name: { first_name: { $contains: q } } },
            { name: { last_name: { $contains: q } } },
          ],
        }
      : undefined

    const peopleResp = await attioClient.queryPeople({
      filter: filterExpression,
      sorts: [{ direction: 'desc', attribute: 'last_setting_action_at' }],
      limit: 9,
    })

    const companyIds = peopleResp.data.reduce((ids, person) => {
      const companyRef = person.values['company'] as Array<{ target_record_id?: string }> | undefined
      const id = companyRef?.[0]?.target_record_id
      if (id) ids.add(id)
      return ids
    }, new Set<string>())

    const companies = await fetchCompaniesMap(attioClient, companyIds)

    const items: AlfredListItem[] = peopleResp.data.map((person) => {
      const nameValues = person.values['name'] as Array<{ full_name?: string }> | undefined
      const jobTitleValues = person.values['job_title'] as Array<{ value?: string }> | undefined
      const linkedinValues = person.values['linkedin'] as Array<{ value?: string }> | undefined
      const linkedinUrl = linkedinValues?.[0]?.value

      const companyRef = person.values['company'] as Array<{ target_record_id?: string }> | undefined
      const companyId = companyRef?.[0]?.target_record_id

      const subtitleParts: string[] = [jobTitleValues?.[0]?.value ?? '(no position)']
      subtitleParts.push(companyId ? companies[companyId] ?? '(no company)' : '(no company)')

      const title = nameValues?.[0]?.full_name ?? '(no name)'
      const subtitle = subtitleParts.join(' | ')

      return {
        uid: person.id.record_id,
        title,
        subtitle,
        valid: true,
        icon: { path: './esbuild/assets/people.svg' },
        arg: person.web_url,
        quicklookurl: person.web_url,
        text: {
          copy: person.web_url,
          largetype: `${title}\n${subtitle}\n${person.web_url}`,
        },
        mods: {
          cmd: {
            valid: !!linkedinUrl,
            arg: linkedinUrl ?? '',
            subtitle: linkedinUrl ? 'Open LinkedIn profile' : 'No LinkedIn profile',
          },
        },
      }
    })

    if (items.length === 0) {
      items.push({
        uid: 'no-results',
        title: 'No people found',
        subtitle: q ? `Query: ${q}` : 'Type a name to search',
        valid: false,
        icon: { path: alfredClient.icons.getIcon('info') },
      })
    }

    const output: AlfredScriptFilter = { items }
    alfredClient.output(output)
  } catch (error) {
    alfredClient.error(error)
  }
})()
