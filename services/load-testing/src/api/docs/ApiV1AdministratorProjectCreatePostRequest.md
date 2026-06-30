# ApiV1AdministratorProjectCreatePostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**projectSlug** | **string** |  | [default to undefined]
**projectTitle** | **string** |  | [default to undefined]
**ownerOrganizationSlugs** | **Array&lt;string&gt;** |  | [default to undefined]
**subtitle** | **string** |  | [optional] [default to undefined]
**body** | **string** |  | [optional] [default to undefined]
**bodyPlainText** | **string** |  | [optional] [default to undefined]
**bannerPath** | **string** |  | [optional] [default to undefined]
**bannerIsFullPath** | **boolean** |  | [optional] [default to false]
**contentLocalizations** | [**Array&lt;ApiV1AdministratorProjectCreatePostRequestContentLocalizationsInner&gt;**](ApiV1AdministratorProjectCreatePostRequestContentLocalizationsInner.md) |  | [optional] [default to undefined]
**languageSettings** | [**ApiV1AdministratorProjectCreatePostRequestLanguageSettings**](ApiV1AdministratorProjectCreatePostRequestLanguageSettings.md) |  | [optional] [default to undefined]
**attributions** | [**Array&lt;ApiV1AdministratorProjectCreatePostRequestAttributionsInner&gt;**](ApiV1AdministratorProjectCreatePostRequestAttributionsInner.md) |  | [optional] [default to undefined]
**contact** | [**ApiV1AdministratorProjectGetAllProjectsPost200ResponseProjectListInnerContact**](ApiV1AdministratorProjectGetAllProjectsPost200ResponseProjectListInnerContact.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1AdministratorProjectCreatePostRequest } from './api';

const instance: ApiV1AdministratorProjectCreatePostRequest = {
    projectSlug,
    projectTitle,
    ownerOrganizationSlugs,
    subtitle,
    body,
    bodyPlainText,
    bannerPath,
    bannerIsFullPath,
    contentLocalizations,
    languageSettings,
    attributions,
    contact,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
