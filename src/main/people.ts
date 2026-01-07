import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { setTimeout } from 'node:timers/promises'
import { AttioClient } from '@common/attio/client'
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
      } catch (e) {
        // En cas d'erreur sur une company, on ne fait pas tomber tout le rendu
        return [id, '(company fetch error)'] as const
      }
    }),
  )

  return Object.fromEntries(entries)
}

;(async () => {
  const alfredClient = new FastAlfred()

  try {
    const debounceTime = 300

    const attioApiKey: string | undefined = alfredClient.env.getEnv(Variables.API_KEY, {
      defaultValue: process.env.API_KEY,
    })

    if (!attioApiKey) {
      throw new Error('Attio API Key is required')
    }

    await setTimeout(debounceTime)

    const attioClient = new AttioClient({
      accessToken: attioApiKey,
    })

    const filterExpression = alfredClient.input
      ? {
          name: {
            $contains: alfredClient.input,
          },
        }
      : undefined

    const last10PeopleEdited = await attioClient.queryPeople({
      filter: filterExpression,
      sorts: [
        {
          direction: 'desc',
          attribute: 'last_setting_action_at',
        },
      ],
      limit: 9,
    })

    const companyIds = last10PeopleEdited.data.reduce((ids, person) => {
      const companyRef = person.values['company'] as Array<{ target_record_id?: string }> | undefined
      const id = companyRef?.[0]?.target_record_id
      if (id) ids.add(id)
      return ids
    }, new Set<string>())

    const companies = await fetchCompaniesMap(attioClient, companyIds)

    const items: AlfredListItem[] = last10PeopleEdited.data.map((person) => {
      const nameValues = person.values['name'] as Array<{ full_name?: string }> | undefined
      const jobTitleValues = person.values['job_title'] as Array<{ value?: string }> | undefined
      const companyRef = person.values['company'] as Array<{ target_record_id?: string }> | undefined
      const companyId = companyRef?.[0]?.target_record_id

      const subtitleParts: string[] = [jobTitleValues?.[0]?.value ?? '(no position)']
      subtitleParts.push(companyId ? companies[companyId] ?? '(no company)' : '(no company)')

      return {
        uid: person.id.record_id,
        title: nameValues?.[0]?.full_name ?? '(no name)',
        subtitle: subtitleParts.join(' | '),
        icon: {
          path: './esbuild/assets/people.svg',
        },
        arg: person.web_url,
        quicklookurl: person.web_url,
      }
    })

    const output: AlfredScriptFilter = {
      items,
    }

    alfredClient.output(output)
  } catch (error) {
    alfredClient.error(error)
  }
})()
