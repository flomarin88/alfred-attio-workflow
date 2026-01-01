import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import { Variables } from '@common/variables.enum'

;(async () => {
  const alfredClient = new FastAlfred()

  try {
    const attioApiKey: string = alfredClient.env.getEnv(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })

    const attioClient = new AttioClient({
      accessToken: attioApiKey,
    })

    const last10PeopleEdited = await attioClient.queryPeople({
      sorts: [
        {
          direction: 'desc',
          attribute: 'last_setting_action_at',
        },
      ],
      limit: 9,
    })

    console.log(last10PeopleEdited.data[0].values.job_title)
    const items: AlfredListItem[] = last10PeopleEdited.data.map((person) => {
      const nameValues = person.values['name'] as Array<{ full_name?: string }> | undefined
      const jobTitle = person.values['job_title'] as Array<{ value?: string }> | undefined
      return {
        title: nameValues?.[0]?.full_name ?? '(no name)',
        subtitle: jobTitle?.[0]?.value,
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
