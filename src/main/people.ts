import { Attio } from 'attio-js'
import { FastAlfred } from 'fast-alfred'
import { Variables } from '@common/variables.enum'

;(async () => {
    const alfredClient = new FastAlfred()

    const attioApiKey: string = alfredClient.env.getEnv(Variables.API_KEY, { defaultValue: '' })

    const attioClient = new Attio({
        apiKey: attioApiKey,
    })

    const last10PeopleEdited = await attioClient.records.query({
        object: 'people',
        requestBody: {
            sorts: [
                {
                    direction: 'desc',
                    attribute: 'last_setting_action_at',
                },
            ],
            limit: 10,
        },
    })
    console.log(last10PeopleEdited)
    return last10PeopleEdited.data.values
})()
