// fork from: https://gist.github.com/k2wanko/289f5cf231ca80da099c7414dceb465d
//
// firebase admin sdk does not support external account credentials(workload identity).
// so, I created a custom credential class.
//
// see: https://github.com/firebase/firebase-admin-node/issues/1377

import admin from 'firebase-admin'
import { Credential } from 'firebase-admin/app'
import { ComputeEngineCredential } from '../node_modules/firebase-admin/lib/app/credential-internal.js'
import {
  ExternalAccountClient,
  BaseExternalAccountClient
} from 'google-auth-library'
import fs from 'fs/promises'
import axios from 'axios'

export class ExternalAccountCredential
  // Inherits this class because it is verified to be an internal class at Firestore initialization.
  extends ComputeEngineCredential
  implements Credential
{
  private serviceAccountEmail: string
  constructor(serviceAccountEmail: string) {
    super()
    this.serviceAccountEmail = serviceAccountEmail
  }

  // When using credentials obtained with Workload Identity, you can get an access token for the Security Token Service,
  // but you cannot use it as an access token to call the Google Cloud API, so you need to get another access token.
  //
  // see: https://cloud.google.com/iam/docs/troubleshooting-workload-identity-federation#using-federated-creds
  // see: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds#advanced_scenarios
  async getAccessToken(): Promise<admin.GoogleOAuthAccessToken> {
    const stsClient = await this.getStsClient()
    const stsRes = await stsClient.getAccessToken()
    const stsToken = stsRes.res?.data?.access_token || ''

    const req = axios.create({
      baseURL:
        'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${stsToken}`
      },
      responseType: 'json'
    })

    const res = await req
      .post<{ accessToken: string; expireTime: string }>(
        `${this.serviceAccountEmail}:generateAccessToken`,
        {
          scope: ['https://www.googleapis.com/auth/cloud-platform'],
          lifetime: '300s'
        }
      )
      .catch(e => {
        console.error(e)
        return undefined
      })

    return {
      access_token: res?.data.accessToken ?? '',
      expires_in: new Date(res?.data?.expireTime ?? 1000).getTime() / 1000
    }
  }

  private async getStsClient(): Promise<BaseExternalAccountClient> {
    const json = JSON.parse(
      await fs.readFile(
        process.env.GOOGLE_APPLICATION_CREDENTIALS as string,
        'utf-8'
      )
    )
    const client = ExternalAccountClient.fromJSON(json)
    if (!client) {
      throw new Error('client is empty')
    }

    return client
  }
}
