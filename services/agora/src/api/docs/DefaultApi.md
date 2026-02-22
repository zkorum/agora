# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV1AccountGenerateUnusedRandomUsernamePost**](#apiv1accountgenerateunusedrandomusernamepost) | **POST** /api/v1/account/generate-unused-random-username | |
|[**apiV1AccountIsUsernameInUsePost**](#apiv1accountisusernameinusepost) | **POST** /api/v1/account/is-username-in-use | |
|[**apiV1AdministratorOrganizationAddUserOrganizationMappingPost**](#apiv1administratororganizationadduserorganizationmappingpost) | **POST** /api/v1/administrator/organization/add-user-organization-mapping | |
|[**apiV1AdministratorOrganizationCreateOrganizationPost**](#apiv1administratororganizationcreateorganizationpost) | **POST** /api/v1/administrator/organization/create-organization | |
|[**apiV1AdministratorOrganizationDeleteOrganizationPost**](#apiv1administratororganizationdeleteorganizationpost) | **POST** /api/v1/administrator/organization/delete-organization | |
|[**apiV1AdministratorOrganizationGetAllOrganizationsPost**](#apiv1administratororganizationgetallorganizationspost) | **POST** /api/v1/administrator/organization/get-all-organizations | |
|[**apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost**](#apiv1administratororganizationgetorganizationnamesbyusernamepost) | **POST** /api/v1/administrator/organization/get-organization-names-by-username | |
|[**apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost**](#apiv1administratororganizationremoveuserorganizationmappingpost) | **POST** /api/v1/administrator/organization/remove-user-organization-mapping | |
|[**apiV1AuthAuthenticatePost**](#apiv1authauthenticatepost) | **POST** /api/v1/auth/authenticate | |
|[**apiV1AuthCheckLoginStatusPost**](#apiv1authcheckloginstatuspost) | **POST** /api/v1/auth/check-login-status | |
|[**apiV1AuthLogoutPost**](#apiv1authlogoutpost) | **POST** /api/v1/auth/logout | |
|[**apiV1AuthPhoneVerifyOtpPost**](#apiv1authphoneverifyotppost) | **POST** /api/v1/auth/phone/verify-otp | |
|[**apiV1AuthTicketVerifyPost**](#apiv1authticketverifypost) | **POST** /api/v1/auth/ticket/verify | |
|[**apiV1AuthZkpGenerateVerificationLinkPost**](#apiv1authzkpgenerateverificationlinkpost) | **POST** /api/v1/auth/zkp/generate-verification-link | |
|[**apiV1AuthZkpVerifyUserStatusAndAuthenticatePost**](#apiv1authzkpverifyuserstatusandauthenticatepost) | **POST** /api/v1/auth/zkp/verify-user-status-and-authenticate | |
|[**apiV1ConversationClosePost**](#apiv1conversationclosepost) | **POST** /api/v1/conversation/close | |
|[**apiV1ConversationCreatePost**](#apiv1conversationcreatepost) | **POST** /api/v1/conversation/create | |
|[**apiV1ConversationDeletePost**](#apiv1conversationdeletepost) | **POST** /api/v1/conversation/delete | |
|[**apiV1ConversationExportDeletePost**](#apiv1conversationexportdeletepost) | **POST** /api/v1/conversation/export/delete | |
|[**apiV1ConversationExportHistoryPost**](#apiv1conversationexporthistorypost) | **POST** /api/v1/conversation/export/history | |
|[**apiV1ConversationExportReadinessPost**](#apiv1conversationexportreadinesspost) | **POST** /api/v1/conversation/export/readiness | |
|[**apiV1ConversationExportRequestPost**](#apiv1conversationexportrequestpost) | **POST** /api/v1/conversation/export/request | |
|[**apiV1ConversationExportStatusPost**](#apiv1conversationexportstatuspost) | **POST** /api/v1/conversation/export/status | |
|[**apiV1ConversationFetchRecentPost**](#apiv1conversationfetchrecentpost) | **POST** /api/v1/conversation/fetch-recent | |
|[**apiV1ConversationGetForEditPost**](#apiv1conversationgetforeditpost) | **POST** /api/v1/conversation/get-for-edit | |
|[**apiV1ConversationGetPost**](#apiv1conversationgetpost) | **POST** /api/v1/conversation/get | |
|[**apiV1ConversationImportActivePost**](#apiv1conversationimportactivepost) | **POST** /api/v1/conversation/import/active | |
|[**apiV1ConversationImportCsvPost**](#apiv1conversationimportcsvpost) | **POST** /api/v1/conversation/import-csv | |
|[**apiV1ConversationImportPost**](#apiv1conversationimportpost) | **POST** /api/v1/conversation/import | |
|[**apiV1ConversationImportStatusPost**](#apiv1conversationimportstatuspost) | **POST** /api/v1/conversation/import/status | |
|[**apiV1ConversationOpenPost**](#apiv1conversationopenpost) | **POST** /api/v1/conversation/open | |
|[**apiV1ConversationUpdatePost**](#apiv1conversationupdatepost) | **POST** /api/v1/conversation/update | |
|[**apiV1ConversationValidateCsvPost**](#apiv1conversationvalidatecsvpost) | **POST** /api/v1/conversation/validate-csv | |
|[**apiV1ModerationConversationCreatePost**](#apiv1moderationconversationcreatepost) | **POST** /api/v1/moderation/conversation/create | |
|[**apiV1ModerationConversationGetPost**](#apiv1moderationconversationgetpost) | **POST** /api/v1/moderation/conversation/get | |
|[**apiV1ModerationConversationWithdrawPost**](#apiv1moderationconversationwithdrawpost) | **POST** /api/v1/moderation/conversation/withdraw | |
|[**apiV1ModerationOpinionCreatePost**](#apiv1moderationopinioncreatepost) | **POST** /api/v1/moderation/opinion/create | |
|[**apiV1ModerationOpinionGetPost**](#apiv1moderationopiniongetpost) | **POST** /api/v1/moderation/opinion/get | |
|[**apiV1ModerationOpinionWithdrawPost**](#apiv1moderationopinionwithdrawpost) | **POST** /api/v1/moderation/opinion/withdraw | |
|[**apiV1MuteUserCreatePost**](#apiv1muteusercreatepost) | **POST** /api/v1/mute/user/create | |
|[**apiV1MuteUserGetPost**](#apiv1muteusergetpost) | **POST** /api/v1/mute/user/get | |
|[**apiV1NotificationFetchPost**](#apiv1notificationfetchpost) | **POST** /api/v1/notification/fetch | |
|[**apiV1NotificationMarkAllReadPost**](#apiv1notificationmarkallreadpost) | **POST** /api/v1/notification/mark-all-read | |
|[**apiV1NotificationStreamGet**](#apiv1notificationstreamget) | **GET** /api/v1/notification/stream | |
|[**apiV1OpinionCreatePost**](#apiv1opinioncreatepost) | **POST** /api/v1/opinion/create | |
|[**apiV1OpinionDeletePost**](#apiv1opiniondeletepost) | **POST** /api/v1/opinion/delete | |
|[**apiV1OpinionFetchAnalysisByConversationPost**](#apiv1opinionfetchanalysisbyconversationpost) | **POST** /api/v1/opinion/fetch-analysis-by-conversation | |
|[**apiV1OpinionFetchByConversationPost**](#apiv1opinionfetchbyconversationpost) | **POST** /api/v1/opinion/fetch-by-conversation | |
|[**apiV1OpinionFetchBySlugIdListPost**](#apiv1opinionfetchbyslugidlistpost) | **POST** /api/v1/opinion/fetch-by-slug-id-list | |
|[**apiV1OpinionFetchHiddenByConversationPost**](#apiv1opinionfetchhiddenbyconversationpost) | **POST** /api/v1/opinion/fetch-hidden-by-conversation | |
|[**apiV1PollRespondPost**](#apiv1pollrespondpost) | **POST** /api/v1/poll/respond | |
|[**apiV1ReportConversationCreatePost**](#apiv1reportconversationcreatepost) | **POST** /api/v1/report/conversation/create | |
|[**apiV1ReportConversationFetchPost**](#apiv1reportconversationfetchpost) | **POST** /api/v1/report/conversation/fetch | |
|[**apiV1ReportOpinionCreatePost**](#apiv1reportopinioncreatepost) | **POST** /api/v1/report/opinion/create | |
|[**apiV1ReportOpinionFetchPost**](#apiv1reportopinionfetchpost) | **POST** /api/v1/report/opinion/fetch | |
|[**apiV1TopicFollowPost**](#apiv1topicfollowpost) | **POST** /api/v1/topic/follow | |
|[**apiV1TopicGetAllTopicsPost**](#apiv1topicgetalltopicspost) | **POST** /api/v1/topic/get-all-topics | |
|[**apiV1TopicGetFollowedPost**](#apiv1topicgetfollowedpost) | **POST** /api/v1/topic/get-followed | |
|[**apiV1TopicUnfollowPost**](#apiv1topicunfollowpost) | **POST** /api/v1/topic/unfollow | |
|[**apiV1UserConversationFetchPost**](#apiv1userconversationfetchpost) | **POST** /api/v1/user/conversation/fetch | |
|[**apiV1UserDeletePost**](#apiv1userdeletepost) | **POST** /api/v1/user/delete | |
|[**apiV1UserLanguagePreferencesGetPost**](#apiv1userlanguagepreferencesgetpost) | **POST** /api/v1/user/language-preferences/get | |
|[**apiV1UserLanguagePreferencesUpdatePost**](#apiv1userlanguagepreferencesupdatepost) | **POST** /api/v1/user/language-preferences/update | |
|[**apiV1UserOpinionFetchPost**](#apiv1useropinionfetchpost) | **POST** /api/v1/user/opinion/fetch | |
|[**apiV1UserPollGetResponseByConversationsPost**](#apiv1userpollgetresponsebyconversationspost) | **POST** /api/v1/user/poll/get-response-by-conversations | |
|[**apiV1UserProfileGetPost**](#apiv1userprofilegetpost) | **POST** /api/v1/user/profile/get | |
|[**apiV1UserUsernameUpdatePost**](#apiv1userusernameupdatepost) | **POST** /api/v1/user/username/update | |
|[**apiV1UserVoteGetByConversationsPost**](#apiv1uservotegetbyconversationspost) | **POST** /api/v1/user/vote/get-by-conversations | |
|[**apiV1VoteCastPost**](#apiv1votecastpost) | **POST** /api/v1/vote/cast | |

# **apiV1AccountGenerateUnusedRandomUsernamePost**
> string apiV1AccountGenerateUnusedRandomUsernamePost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1AccountGenerateUnusedRandomUsernamePost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AccountIsUsernameInUsePost**
> boolean apiV1AccountIsUsernameInUsePost(apiV1UserUsernameUpdatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserUsernameUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserUsernameUpdatePostRequest: ApiV1UserUsernameUpdatePostRequest; //

const { status, data } = await apiInstance.apiV1AccountIsUsernameInUsePost(
    apiV1UserUsernameUpdatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserUsernameUpdatePostRequest** | **ApiV1UserUsernameUpdatePostRequest**|  | |


### Return type

**boolean**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationAddUserOrganizationMappingPost**
> apiV1AdministratorOrganizationAddUserOrganizationMappingPost(apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest: ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest; //

const { status, data } = await apiInstance.apiV1AdministratorOrganizationAddUserOrganizationMappingPost(
    apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest** | **ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationCreateOrganizationPost**
> apiV1AdministratorOrganizationCreateOrganizationPost(apiV1AdministratorOrganizationCreateOrganizationPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AdministratorOrganizationCreateOrganizationPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AdministratorOrganizationCreateOrganizationPostRequest: ApiV1AdministratorOrganizationCreateOrganizationPostRequest; //

const { status, data } = await apiInstance.apiV1AdministratorOrganizationCreateOrganizationPost(
    apiV1AdministratorOrganizationCreateOrganizationPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AdministratorOrganizationCreateOrganizationPostRequest** | **ApiV1AdministratorOrganizationCreateOrganizationPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationDeleteOrganizationPost**
> apiV1AdministratorOrganizationDeleteOrganizationPost(apiV1AdministratorOrganizationDeleteOrganizationPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AdministratorOrganizationDeleteOrganizationPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AdministratorOrganizationDeleteOrganizationPostRequest: ApiV1AdministratorOrganizationDeleteOrganizationPostRequest; //

const { status, data } = await apiInstance.apiV1AdministratorOrganizationDeleteOrganizationPost(
    apiV1AdministratorOrganizationDeleteOrganizationPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AdministratorOrganizationDeleteOrganizationPostRequest** | **ApiV1AdministratorOrganizationDeleteOrganizationPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationGetAllOrganizationsPost**
> ApiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost200Response apiV1AdministratorOrganizationGetAllOrganizationsPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1AdministratorOrganizationGetAllOrganizationsPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost**
> ApiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost200Response apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost(apiV1UserUsernameUpdatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserUsernameUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserUsernameUpdatePostRequest: ApiV1UserUsernameUpdatePostRequest; //

const { status, data } = await apiInstance.apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost(
    apiV1UserUsernameUpdatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserUsernameUpdatePostRequest** | **ApiV1UserUsernameUpdatePostRequest**|  | |


### Return type

**ApiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost**
> apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost(apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest: ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest; //

const { status, data } = await apiInstance.apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost(
    apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest** | **ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthAuthenticatePost**
> ApiV1AuthAuthenticatePost200Response apiV1AuthAuthenticatePost(apiV1AuthAuthenticatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AuthAuthenticatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AuthAuthenticatePostRequest: ApiV1AuthAuthenticatePostRequest; //

const { status, data } = await apiInstance.apiV1AuthAuthenticatePost(
    apiV1AuthAuthenticatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AuthAuthenticatePostRequest** | **ApiV1AuthAuthenticatePostRequest**|  | |


### Return type

**ApiV1AuthAuthenticatePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthCheckLoginStatusPost**
> ApiV1AuthCheckLoginStatusPost200Response apiV1AuthCheckLoginStatusPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1AuthCheckLoginStatusPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1AuthCheckLoginStatusPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthLogoutPost**
> apiV1AuthLogoutPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1AuthLogoutPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthPhoneVerifyOtpPost**
> ApiV1AuthPhoneVerifyOtpPost200Response apiV1AuthPhoneVerifyOtpPost(apiV1AuthPhoneVerifyOtpPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AuthPhoneVerifyOtpPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AuthPhoneVerifyOtpPostRequest: ApiV1AuthPhoneVerifyOtpPostRequest; //

const { status, data } = await apiInstance.apiV1AuthPhoneVerifyOtpPost(
    apiV1AuthPhoneVerifyOtpPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AuthPhoneVerifyOtpPostRequest** | **ApiV1AuthPhoneVerifyOtpPostRequest**|  | |


### Return type

**ApiV1AuthPhoneVerifyOtpPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthTicketVerifyPost**
> ApiV1AuthTicketVerifyPost200Response apiV1AuthTicketVerifyPost(apiV1AuthTicketVerifyPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AuthTicketVerifyPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AuthTicketVerifyPostRequest: ApiV1AuthTicketVerifyPostRequest; //

const { status, data } = await apiInstance.apiV1AuthTicketVerifyPost(
    apiV1AuthTicketVerifyPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AuthTicketVerifyPostRequest** | **ApiV1AuthTicketVerifyPostRequest**|  | |


### Return type

**ApiV1AuthTicketVerifyPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthZkpGenerateVerificationLinkPost**
> ApiV1AuthZkpGenerateVerificationLinkPost200Response apiV1AuthZkpGenerateVerificationLinkPost(apiV1AuthZkpGenerateVerificationLinkPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1AuthZkpGenerateVerificationLinkPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1AuthZkpGenerateVerificationLinkPostRequest: ApiV1AuthZkpGenerateVerificationLinkPostRequest; //

const { status, data } = await apiInstance.apiV1AuthZkpGenerateVerificationLinkPost(
    apiV1AuthZkpGenerateVerificationLinkPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1AuthZkpGenerateVerificationLinkPostRequest** | **ApiV1AuthZkpGenerateVerificationLinkPostRequest**|  | |


### Return type

**ApiV1AuthZkpGenerateVerificationLinkPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1AuthZkpVerifyUserStatusAndAuthenticatePost**
> ApiV1AuthZkpVerifyUserStatusAndAuthenticatePost200Response apiV1AuthZkpVerifyUserStatusAndAuthenticatePost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1AuthZkpVerifyUserStatusAndAuthenticatePost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1AuthZkpVerifyUserStatusAndAuthenticatePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationClosePost**
> ApiV1ConversationClosePost200Response apiV1ConversationClosePost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationClosePost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationClosePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationCreatePost**
> ApiV1ConversationCreatePost200Response apiV1ConversationCreatePost(apiV1ConversationCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationCreatePostRequest: ApiV1ConversationCreatePostRequest; //

const { status, data } = await apiInstance.apiV1ConversationCreatePost(
    apiV1ConversationCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationCreatePostRequest** | **ApiV1ConversationCreatePostRequest**|  | |


### Return type

**ApiV1ConversationCreatePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationDeletePost**
> apiV1ConversationDeletePost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationDeletePost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationExportDeletePost**
> apiV1ConversationExportDeletePost(apiV1ConversationExportStatusPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationExportStatusPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationExportStatusPostRequest: ApiV1ConversationExportStatusPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationExportDeletePost(
    apiV1ConversationExportStatusPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationExportStatusPostRequest** | **ApiV1ConversationExportStatusPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationExportHistoryPost**
> Array<ApiV1ConversationExportHistoryPost200ResponseInner> apiV1ConversationExportHistoryPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationExportHistoryPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**Array<ApiV1ConversationExportHistoryPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationExportReadinessPost**
> ApiV1ConversationExportReadinessPost200Response apiV1ConversationExportReadinessPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationExportReadinessPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationExportReadinessPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationExportRequestPost**
> ApiV1ConversationExportRequestPost200Response apiV1ConversationExportRequestPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationExportRequestPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationExportRequestPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationExportStatusPost**
> ApiV1ConversationExportStatusPost200Response apiV1ConversationExportStatusPost(apiV1ConversationExportStatusPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationExportStatusPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationExportStatusPostRequest: ApiV1ConversationExportStatusPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationExportStatusPost(
    apiV1ConversationExportStatusPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationExportStatusPostRequest** | **ApiV1ConversationExportStatusPostRequest**|  | |


### Return type

**ApiV1ConversationExportStatusPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationFetchRecentPost**
> ApiV1ConversationFetchRecentPost200Response apiV1ConversationFetchRecentPost(apiV1ConversationFetchRecentPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationFetchRecentPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationFetchRecentPostRequest: ApiV1ConversationFetchRecentPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationFetchRecentPost(
    apiV1ConversationFetchRecentPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationFetchRecentPostRequest** | **ApiV1ConversationFetchRecentPostRequest**|  | |


### Return type

**ApiV1ConversationFetchRecentPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationGetForEditPost**
> ApiV1ConversationGetForEditPost200Response apiV1ConversationGetForEditPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationGetForEditPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationGetForEditPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationGetPost**
> ApiV1ConversationGetPost200Response apiV1ConversationGetPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationGetPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationGetPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationImportActivePost**
> ApiV1ConversationImportActivePost200Response apiV1ConversationImportActivePost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1ConversationImportActivePost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1ConversationImportActivePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationImportCsvPost**
> ApiV1ConversationImportPost200Response apiV1ConversationImportCsvPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1ConversationImportCsvPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1ConversationImportPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationImportPost**
> ApiV1ConversationImportPost200Response apiV1ConversationImportPost(apiV1ConversationImportPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationImportPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationImportPostRequest: ApiV1ConversationImportPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationImportPost(
    apiV1ConversationImportPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationImportPostRequest** | **ApiV1ConversationImportPostRequest**|  | |


### Return type

**ApiV1ConversationImportPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationImportStatusPost**
> ApiV1ConversationImportStatusPost200Response apiV1ConversationImportStatusPost(apiV1ConversationImportStatusPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationImportStatusPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationImportStatusPostRequest: ApiV1ConversationImportStatusPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationImportStatusPost(
    apiV1ConversationImportStatusPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationImportStatusPostRequest** | **ApiV1ConversationImportStatusPostRequest**|  | |


### Return type

**ApiV1ConversationImportStatusPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationOpenPost**
> ApiV1ConversationOpenPost200Response apiV1ConversationOpenPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ConversationOpenPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1ConversationOpenPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationUpdatePost**
> ApiV1ConversationUpdatePost200Response apiV1ConversationUpdatePost(apiV1ConversationUpdatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ConversationUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ConversationUpdatePostRequest: ApiV1ConversationUpdatePostRequest; //

const { status, data } = await apiInstance.apiV1ConversationUpdatePost(
    apiV1ConversationUpdatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ConversationUpdatePostRequest** | **ApiV1ConversationUpdatePostRequest**|  | |


### Return type

**ApiV1ConversationUpdatePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ConversationValidateCsvPost**
> ApiV1ConversationValidateCsvPost200Response apiV1ConversationValidateCsvPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1ConversationValidateCsvPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1ConversationValidateCsvPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationConversationCreatePost**
> apiV1ModerationConversationCreatePost(apiV1ModerationConversationCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationCreatePostRequest: ApiV1ModerationConversationCreatePostRequest; //

const { status, data } = await apiInstance.apiV1ModerationConversationCreatePost(
    apiV1ModerationConversationCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationCreatePostRequest** | **ApiV1ModerationConversationCreatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationConversationGetPost**
> ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerMetadataModeration apiV1ModerationConversationGetPost(apiV1ModerationConversationGetPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationGetPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationGetPostRequest: ApiV1ModerationConversationGetPostRequest; //

const { status, data } = await apiInstance.apiV1ModerationConversationGetPost(
    apiV1ModerationConversationGetPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationGetPostRequest** | **ApiV1ModerationConversationGetPostRequest**|  | |


### Return type

**ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerMetadataModeration**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationConversationWithdrawPost**
> apiV1ModerationConversationWithdrawPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ModerationConversationWithdrawPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationOpinionCreatePost**
> apiV1ModerationOpinionCreatePost(apiV1ModerationOpinionCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationOpinionCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationOpinionCreatePostRequest: ApiV1ModerationOpinionCreatePostRequest; //

const { status, data } = await apiInstance.apiV1ModerationOpinionCreatePost(
    apiV1ModerationOpinionCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationOpinionCreatePostRequest** | **ApiV1ModerationOpinionCreatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationOpinionGetPost**
> ApiV1ModerationOpinionGetPost200Response apiV1ModerationOpinionGetPost(apiV1ModerationOpinionWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationOpinionWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationOpinionWithdrawPostRequest: ApiV1ModerationOpinionWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ModerationOpinionGetPost(
    apiV1ModerationOpinionWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationOpinionWithdrawPostRequest** | **ApiV1ModerationOpinionWithdrawPostRequest**|  | |


### Return type

**ApiV1ModerationOpinionGetPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ModerationOpinionWithdrawPost**
> apiV1ModerationOpinionWithdrawPost(apiV1ModerationOpinionWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationOpinionWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationOpinionWithdrawPostRequest: ApiV1ModerationOpinionWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ModerationOpinionWithdrawPost(
    apiV1ModerationOpinionWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationOpinionWithdrawPostRequest** | **ApiV1ModerationOpinionWithdrawPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1MuteUserCreatePost**
> apiV1MuteUserCreatePost(apiV1MuteUserCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1MuteUserCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1MuteUserCreatePostRequest: ApiV1MuteUserCreatePostRequest; //

const { status, data } = await apiInstance.apiV1MuteUserCreatePost(
    apiV1MuteUserCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1MuteUserCreatePostRequest** | **ApiV1MuteUserCreatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1MuteUserGetPost**
> Array<ApiV1MuteUserGetPost200ResponseInner> apiV1MuteUserGetPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1MuteUserGetPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ApiV1MuteUserGetPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1NotificationFetchPost**
> ApiV1NotificationFetchPost200Response apiV1NotificationFetchPost(apiV1NotificationFetchPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1NotificationFetchPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1NotificationFetchPostRequest: ApiV1NotificationFetchPostRequest; //

const { status, data } = await apiInstance.apiV1NotificationFetchPost(
    apiV1NotificationFetchPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1NotificationFetchPostRequest** | **ApiV1NotificationFetchPostRequest**|  | |


### Return type

**ApiV1NotificationFetchPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1NotificationMarkAllReadPost**
> apiV1NotificationMarkAllReadPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1NotificationMarkAllReadPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1NotificationStreamGet**
> apiV1NotificationStreamGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let auth: string; // (default to undefined)

const { status, data } = await apiInstance.apiV1NotificationStreamGet(
    auth
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **auth** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionCreatePost**
> ApiV1OpinionCreatePost200Response apiV1OpinionCreatePost(apiV1OpinionCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1OpinionCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1OpinionCreatePostRequest: ApiV1OpinionCreatePostRequest; //

const { status, data } = await apiInstance.apiV1OpinionCreatePost(
    apiV1OpinionCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1OpinionCreatePostRequest** | **ApiV1OpinionCreatePostRequest**|  | |


### Return type

**ApiV1OpinionCreatePost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionDeletePost**
> apiV1OpinionDeletePost(apiV1ModerationOpinionWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationOpinionWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationOpinionWithdrawPostRequest: ApiV1ModerationOpinionWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1OpinionDeletePost(
    apiV1ModerationOpinionWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationOpinionWithdrawPostRequest** | **ApiV1ModerationOpinionWithdrawPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionFetchAnalysisByConversationPost**
> ApiV1OpinionFetchAnalysisByConversationPost200Response apiV1OpinionFetchAnalysisByConversationPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1OpinionFetchAnalysisByConversationPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**ApiV1OpinionFetchAnalysisByConversationPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionFetchByConversationPost**
> Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem> apiV1OpinionFetchByConversationPost(apiV1OpinionFetchByConversationPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1OpinionFetchByConversationPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1OpinionFetchByConversationPostRequest: ApiV1OpinionFetchByConversationPostRequest; //

const { status, data } = await apiInstance.apiV1OpinionFetchByConversationPost(
    apiV1OpinionFetchByConversationPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1OpinionFetchByConversationPostRequest** | **ApiV1OpinionFetchByConversationPostRequest**|  | |


### Return type

**Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionFetchBySlugIdListPost**
> Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem> apiV1OpinionFetchBySlugIdListPost(apiV1OpinionFetchBySlugIdListPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1OpinionFetchBySlugIdListPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1OpinionFetchBySlugIdListPostRequest: ApiV1OpinionFetchBySlugIdListPostRequest; //

const { status, data } = await apiInstance.apiV1OpinionFetchBySlugIdListPost(
    apiV1OpinionFetchBySlugIdListPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1OpinionFetchBySlugIdListPostRequest** | **ApiV1OpinionFetchBySlugIdListPostRequest**|  | |


### Return type

**Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1OpinionFetchHiddenByConversationPost**
> Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem> apiV1OpinionFetchHiddenByConversationPost(apiV1OpinionFetchHiddenByConversationPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1OpinionFetchHiddenByConversationPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1OpinionFetchHiddenByConversationPostRequest: ApiV1OpinionFetchHiddenByConversationPostRequest; //

const { status, data } = await apiInstance.apiV1OpinionFetchHiddenByConversationPost(
    apiV1OpinionFetchHiddenByConversationPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1OpinionFetchHiddenByConversationPostRequest** | **ApiV1OpinionFetchHiddenByConversationPostRequest**|  | |


### Return type

**Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1PollRespondPost**
> apiV1PollRespondPost(apiV1PollRespondPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1PollRespondPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1PollRespondPostRequest: ApiV1PollRespondPostRequest; //

const { status, data } = await apiInstance.apiV1PollRespondPost(
    apiV1PollRespondPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1PollRespondPostRequest** | **ApiV1PollRespondPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ReportConversationCreatePost**
> apiV1ReportConversationCreatePost(apiV1ReportConversationCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ReportConversationCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ReportConversationCreatePostRequest: ApiV1ReportConversationCreatePostRequest; //

const { status, data } = await apiInstance.apiV1ReportConversationCreatePost(
    apiV1ReportConversationCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ReportConversationCreatePostRequest** | **ApiV1ReportConversationCreatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ReportConversationFetchPost**
> Array<ApiV1ReportConversationFetchPost200ResponseInner> apiV1ReportConversationFetchPost(apiV1ModerationConversationWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationConversationWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationConversationWithdrawPostRequest: ApiV1ModerationConversationWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ReportConversationFetchPost(
    apiV1ModerationConversationWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationConversationWithdrawPostRequest** | **ApiV1ModerationConversationWithdrawPostRequest**|  | |


### Return type

**Array<ApiV1ReportConversationFetchPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ReportOpinionCreatePost**
> apiV1ReportOpinionCreatePost(apiV1ReportOpinionCreatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ReportOpinionCreatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ReportOpinionCreatePostRequest: ApiV1ReportOpinionCreatePostRequest; //

const { status, data } = await apiInstance.apiV1ReportOpinionCreatePost(
    apiV1ReportOpinionCreatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ReportOpinionCreatePostRequest** | **ApiV1ReportOpinionCreatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1ReportOpinionFetchPost**
> Array<ApiV1ReportConversationFetchPost200ResponseInner> apiV1ReportOpinionFetchPost(apiV1ModerationOpinionWithdrawPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1ModerationOpinionWithdrawPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1ModerationOpinionWithdrawPostRequest: ApiV1ModerationOpinionWithdrawPostRequest; //

const { status, data } = await apiInstance.apiV1ReportOpinionFetchPost(
    apiV1ModerationOpinionWithdrawPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1ModerationOpinionWithdrawPostRequest** | **ApiV1ModerationOpinionWithdrawPostRequest**|  | |


### Return type

**Array<ApiV1ReportConversationFetchPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1TopicFollowPost**
> apiV1TopicFollowPost(apiV1TopicFollowPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1TopicFollowPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1TopicFollowPostRequest: ApiV1TopicFollowPostRequest; //

const { status, data } = await apiInstance.apiV1TopicFollowPost(
    apiV1TopicFollowPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1TopicFollowPostRequest** | **ApiV1TopicFollowPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1TopicGetAllTopicsPost**
> ApiV1TopicGetAllTopicsPost200Response apiV1TopicGetAllTopicsPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1TopicGetAllTopicsPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1TopicGetAllTopicsPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1TopicGetFollowedPost**
> ApiV1TopicGetFollowedPost200Response apiV1TopicGetFollowedPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1TopicGetFollowedPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1TopicGetFollowedPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1TopicUnfollowPost**
> apiV1TopicUnfollowPost(apiV1TopicFollowPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1TopicFollowPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1TopicFollowPostRequest: ApiV1TopicFollowPostRequest; //

const { status, data } = await apiInstance.apiV1TopicUnfollowPost(
    apiV1TopicFollowPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1TopicFollowPostRequest** | **ApiV1TopicFollowPostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserConversationFetchPost**
> Array<ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner> apiV1UserConversationFetchPost(apiV1UserConversationFetchPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserConversationFetchPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserConversationFetchPostRequest: ApiV1UserConversationFetchPostRequest; //

const { status, data } = await apiInstance.apiV1UserConversationFetchPost(
    apiV1UserConversationFetchPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserConversationFetchPostRequest** | **ApiV1UserConversationFetchPostRequest**|  | |


### Return type

**Array<ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserDeletePost**
> apiV1UserDeletePost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1UserDeletePost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserLanguagePreferencesGetPost**
> ApiV1UserLanguagePreferencesGetPost200Response apiV1UserLanguagePreferencesGetPost(apiV1UserLanguagePreferencesGetPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserLanguagePreferencesGetPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserLanguagePreferencesGetPostRequest: ApiV1UserLanguagePreferencesGetPostRequest; //

const { status, data } = await apiInstance.apiV1UserLanguagePreferencesGetPost(
    apiV1UserLanguagePreferencesGetPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserLanguagePreferencesGetPostRequest** | **ApiV1UserLanguagePreferencesGetPostRequest**|  | |


### Return type

**ApiV1UserLanguagePreferencesGetPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserLanguagePreferencesUpdatePost**
> apiV1UserLanguagePreferencesUpdatePost(apiV1UserLanguagePreferencesUpdatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserLanguagePreferencesUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserLanguagePreferencesUpdatePostRequest: ApiV1UserLanguagePreferencesUpdatePostRequest; //

const { status, data } = await apiInstance.apiV1UserLanguagePreferencesUpdatePost(
    apiV1UserLanguagePreferencesUpdatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserLanguagePreferencesUpdatePostRequest** | **ApiV1UserLanguagePreferencesUpdatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserOpinionFetchPost**
> Array<ApiV1UserOpinionFetchPost200ResponseInner> apiV1UserOpinionFetchPost(apiV1UserOpinionFetchPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserOpinionFetchPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserOpinionFetchPostRequest: ApiV1UserOpinionFetchPostRequest; //

const { status, data } = await apiInstance.apiV1UserOpinionFetchPost(
    apiV1UserOpinionFetchPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserOpinionFetchPostRequest** | **ApiV1UserOpinionFetchPostRequest**|  | |


### Return type

**Array<ApiV1UserOpinionFetchPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserPollGetResponseByConversationsPost**
> Array<ApiV1UserPollGetResponseByConversationsPost200ResponseInner> apiV1UserPollGetResponseByConversationsPost(requestBody)


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let requestBody: Array<string>; //

const { status, data } = await apiInstance.apiV1UserPollGetResponseByConversationsPost(
    requestBody
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **requestBody** | **Array<string>**|  | |


### Return type

**Array<ApiV1UserPollGetResponseByConversationsPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserProfileGetPost**
> ApiV1UserProfileGetPost200Response apiV1UserProfileGetPost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiV1UserProfileGetPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV1UserProfileGetPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserUsernameUpdatePost**
> apiV1UserUsernameUpdatePost(apiV1UserUsernameUpdatePostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserUsernameUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserUsernameUpdatePostRequest: ApiV1UserUsernameUpdatePostRequest; //

const { status, data } = await apiInstance.apiV1UserUsernameUpdatePost(
    apiV1UserUsernameUpdatePostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserUsernameUpdatePostRequest** | **ApiV1UserUsernameUpdatePostRequest**|  | |


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1UserVoteGetByConversationsPost**
> Array<ApiV1UserVoteGetByConversationsPost200ResponseInner> apiV1UserVoteGetByConversationsPost(apiV1UserVoteGetByConversationsPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1UserVoteGetByConversationsPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1UserVoteGetByConversationsPostRequest: ApiV1UserVoteGetByConversationsPostRequest; //

const { status, data } = await apiInstance.apiV1UserVoteGetByConversationsPost(
    apiV1UserVoteGetByConversationsPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1UserVoteGetByConversationsPostRequest** | **ApiV1UserVoteGetByConversationsPostRequest**|  | |


### Return type

**Array<ApiV1UserVoteGetByConversationsPost200ResponseInner>**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV1VoteCastPost**
> ApiV1VoteCastPost200Response apiV1VoteCastPost(apiV1VoteCastPostRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiV1VoteCastPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiV1VoteCastPostRequest: ApiV1VoteCastPostRequest; //

const { status, data } = await apiInstance.apiV1VoteCastPost(
    apiV1VoteCastPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV1VoteCastPostRequest** | **ApiV1VoteCastPostRequest**|  | |


### Return type

**ApiV1VoteCastPost200Response**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Default Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

