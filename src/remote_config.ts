import * as admin from 'firebase-admin'
import {
  RemoteConfig,
  RemoteConfigTemplate
} from 'firebase-admin/remote-config'
import * as fs from 'fs'
import path from 'path'
import { diffString } from 'json-diff'
import { ExternalAccountCredential } from './credential'

export class RemoteConfigWrapper {
  private templateFilePath: string
  private app: admin.app.App
  private config: RemoteConfig

  constructor({
    serviceAccountEmail,
    templateFilePath
  }: {
    serviceAccountEmail: string
    templateFilePath: string
  }) {
    this.templateFilePath = templateFilePath

    const credential = new ExternalAccountCredential(serviceAccountEmail)
    this.app = admin.initializeApp({
      credential: credential
      // credential: admin.credential.cert(
      //   path.resolve(__dirname, serviceAccountKeyPath)
      // )
    })

    this.config = admin.remoteConfig(this.app)
  }

  private getNewTemplate = (etag: string): RemoteConfigTemplate =>
    this.config.createTemplateFromJSON(
      JSON.stringify({
        ...JSON.parse(
          fs.readFileSync(
            path.resolve(__dirname, this.templateFilePath),
            'utf8'
          )
        ),

        // It is necessary to always specify etag according to the specification of the sdk
        etag: etag
      })
    )

  validate = async () => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag)

    this.config
      .validateTemplate(newTemplate)
      .then(validatedTemplate => {
        console.log('Template is valid')
      })
      .catch(err => {
        console.error('Template is invalid:', err)
        throw err
      })
  }

  publish = async () => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag)

    this.config
      .publishTemplate(newTemplate)
      .then(publishedTemplate => {
        console.log('Template has been published')
      })
      .catch(err => {
        console.error('Error publishing template:', err)
        throw err
      })
  }

  diff = async (): Promise<string> => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag)

    const diffResult = diffString(currentTemplate, newTemplate)
    console.log(diffResult)
    return diffResult
  }
}
