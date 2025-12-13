import { FastAlfred } from 'fast-alfred'
import { Variables } from '@common/variables.enum'

;(() => {
    const alfredClient = new FastAlfred()

    const attioApiKey: string = alfredClient.env.getEnv(Variables.API_KEY) || ''
    alfredClient.log('api key -> ' + attioApiKey)
})()
