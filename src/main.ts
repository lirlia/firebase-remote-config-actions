import * as core from "@actions/core";
import { RemoteConfigWrapper } from "./remote_config";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const command: string = core.getInput("command");
		const templateFilePath: string = core.getInput("template-file-path");
		const serviceAccountEmail: string = core.getInput("service-account-email");

		core.debug(`Command: ${command}`);
		core.debug(`Template File Path: ${templateFilePath}`);

		const remoteConfigWrapper = new RemoteConfigWrapper({
			serviceAccountEmail: serviceAccountEmail,
			templateFilePath: templateFilePath,
		});

		switch (command) {
			case "validate": {
				const { isValid, reason } = await remoteConfigWrapper.validate();
				core.setOutput("is-valid", isValid);
				core.setOutput("invalid-reason", reason);
				break;
			}
			case "publish":
				await remoteConfigWrapper.publish();
				break;
			case "diff":
				core.setOutput("diff", await remoteConfigWrapper.diff());
				break;
			default:
				core.setFailed(`Invalid command: ${command}`);
		}
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
