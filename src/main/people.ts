import { Attio } from 'attio-js'
import { FastAlfred } from 'fast-alfred'
import { Variables } from '@common/variables.enum'

;(async () => {
    const alfredClient = new FastAlfred()

    const attioApiKey: string = alfredClient.env.getEnv(Variables.API_KEY, { defaultValue: '' })
    alfredClient.log('api key -> ' + attioApiKey)

    const attioClient = new Attio({
        apiKey: attioApiKey,
    })

    const people = await attioClient.objects.list()
    console.log(people)
})()
