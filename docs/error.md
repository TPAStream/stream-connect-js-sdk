# Error Documentation

## This is not a valid version for this endpoint
This error occurs when the current version of the sdk you are using is lower than
the supported versions on the end-points. We currently support and maintain up to
10 minor versions.

## There was no APIKey Provided
This is referring to the `sdkToken` value within the configuration. When the sdkToken value is not set you will receive this error telling you to provide a token.

## This Token is not active
This error occurs when you have a valid token set in your configuraiton, but your token hasn't been activated or has been deactivated. Please contact TPAStream support to activate your token if you receive this error.

## User is not a valid user for the easyenrollment sdk
This user was configured to be an Admin with the TPAStream System. The SDK requires that you use emails to create *new* users within the TPAStream system or use emails which are only linked to policyholders in our system.

## You are missing required parameters in user. We require [firstName, lastName, email].
In order for the StreamConnect SDK to create a new user which is compatible for the SDK the sdk requires firstName, lastName, and email to be present within the `user` sdk configuration block.