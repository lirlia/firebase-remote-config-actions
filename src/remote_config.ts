import * as admin from 'firebase-admin'
import { RemoteConfig, RemoteConfigTemplate } from 'firebase-admin/remote-config'
import * as fs from 'fs'
import path from 'path'
import { diffString } from 'json-diff'

export class RemoteConfigWrapper {
  private serviceAccount: string;
  private templateFilePath: string;
  private app: admin.app.App;
  private config: RemoteConfig;

  constructor(
    {
      serviceAccount,
      templateFilePath,
    }: {
      serviceAccount: string,
      templateFilePath: string,
    }
  ) {
    this.serviceAccount = serviceAccount
    this.templateFilePath = templateFilePath
    this.app = admin.initializeApp({
      credential: admin.credential.cert(this.serviceAccount),
    })

    this.config = admin.remoteConfig(this.app)
  }


  private getNewTemplate = (etag: string): RemoteConfigTemplate => this.config.createTemplateFromJSON(JSON.stringify({
    ...JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          this.templateFilePath),
        'utf8')
    ),

    // It is necessary to always specify etag according to the specification of the sdk
    etag: etag,
  })
  )

  validate = async () => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag);

    this.config.validateTemplate(
      newTemplate
    ).then((validatedTemplate) => {
      console.debug('Template is valid')
    }).catch((err) => {
      console.debug('Template is invalid:', err)
      throw err;
    });
  }

  publish = async (templateFilePath: string) => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag);

    this.config.publishTemplate(newTemplate).then((publishedTemplate) => {
      console.debug('Template has been published')
    }
    ).catch((err) => {
      console.debug('Error publishing template:', err)
      throw err;
    });
  }

  diff = async (templateFilePath: string): Promise<string> => {
    const currentTemplate = await this.config.getTemplate()
    const newTemplate = this.getNewTemplate(currentTemplate.etag);

    const diffResult = diffString(currentTemplate, newTemplate);
    console.debug(diffResult)
    return diffResult;
  }
}
