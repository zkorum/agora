# Embedding Agora on your webiste

Quick guide on how to embed an Agora conversation into your website using an iframe.

## Step 1: copy embed url

Click on the three dots and then `Embed Link` to copy the url to your clipboard

For example for this conversation: <https://agoracitizen.network/feed/conversation/ss_4Cg/> the copied link will be <https://agoracitizen.network/feed/conversation/ss_4Cg/embed>

## Step 2: select the embedding mode

Either directly within HTML or using some external plugin that does this job for you like [iframe](https://wordpress.org/plugins/iframe/) if you're using WordPress.

### Direct HTML

Modify `src` with the URL copied during the Step 1:

```
<iframe style="aspect-ratio: 1/1; width:100%"  src="https://agoracitizen.network/feed/conversation/ss_4Cg/embed" title="Agora Citizen Network" frameborder="0" allow="clipboard-write; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
```

Important note: if you're using WordPress.com Free plan, this will not work because WordPress.com removes all the custom iframes before publishing (except from established platforms such as YouTube) for security reasons (<https://wordpress.com/forums/topic/iframe-not-displaying/>).
You should still be able to display Agora with "Preview" successfully when adding a `Custom HTML` element.

### With the iframe wordpress plugin

If you're using WordPress, and notably WordPress.com, you might have to purchase the Business Plan and eventualy use the [iframe](https://wordpress.org/plugins/iframe/) plugin to use iframes outside of the supported big platforms.

Here is an example iframe code using this plugin, modify `src` with the URL copied during the Step 1:

```
[iframe style="aspect-ratio: 1/1; width:100%" src="http://www.youtube.com/embed/7_nAZQt9qu0" title="Agora Citizen Network" frameborder="0" allow="clipboard-write; web-share" referrerpolicy="strict-origin-when-cross-origin"]
```

Note: I wasn't able to test that part, so let me know if you run into any issues.

## Helpful resources

For WordPress:

- <https://www.youtube.com/watch?v=IHRXOUUT2iY>

## Future improvements in Agora

- We will provide a similar experience as the big platforms: users will be able to copy the iframe code directly from Agora, instead of just copying the embed url alone.
- We will improve the embed link experience, see <https://github.com/zkorum/agora/pull/286#pullrequestreview-3079094218> for known issues
- We will create a specific page for organizations, and provide an embed code for it, so organizations can embed their list of conversations on their website
- ... and more

Happy to receive your early feedback on this feature!
