# Quick Start
A guide to get an implementation up and running as quickly as possible. This guide
will not go into the deep customization of the SDK, but rather will look at getting
the SDK to be configured properly, to be able to submit credentials and validate them.

## Step 1 -- Import the SDK
This guide will use a simple html document with the configuration of the StreamConnect SDK set in an html head script.
The html surrounding the SDK will not change throughout the guide.

Here is what the test htmlscript looks like.
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://app.tpastream.com/static/js/sdk.js"></script>
    </head>
    <body></body>
</html>
```

`<script src="https://app.tpastream.com/static/js/sdk.js"></script>` in the head will bring down the latest version of the StreamConnect SDK. If you need to pin to a specific version, change the src to something like
`<script src="https://app.tpastream.com/static/js/sdk-v-0.8.0.js"></script>`. Pinned versions remain available indefinitely.

The 0.8 SDK is visually self-contained: it does not require Bootstrap, jQuery, FontAwesome, or any other host-page CSS. Host pages that already load Bootstrap can keep doing so without conflict. SDK styles use a `tpa-` class prefix to avoid name collisions with host CSS, and the reset/theme variables are wrapped under `.tpa-sdk-root` so they only affect the SDK subtree.

## Step 2 -- Add element for SDK to hook to and init SDK
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://app.tpastream.com/static/js/sdk.js"></script>
        <script>
            window.StreamConnect({
                el: '#sdk-hook',
                isDemo: true,
            })
        </script>
    </head>
    <body>
        <div id="sdk-hook"></div>
    </body>
</html>
```

The SDK will nest all of its elements beneath whatever div you target via a css selector in the `el` element. It is suggested
that an implementor starts the SDK init with `isDemo` set to true as shown above so that an implmenetor can see the initial SDK page.

*Demo mode is incapable of saving credentials or validating credentials.

If you then open up the above html in a browser you should see something close to the following.
![Demo Init Page](https://tpastream-public.s3.amazonaws.com/sdk-docs/quickstart-screenshots/demo-init-page.png)

## Step 3 -- Add sdk Token
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://app.tpastream.com/static/js/sdk.js"></script>
        <script>
            window.StreamConnect({
                el: '#sdk-hook',
                isDemo: false,
                sdkToken: 'Your-SDK-Token-Here', // Same as apiToken: 'Your-SDK-Token-Here'
            })
        </script>
    </head>
    <body>
        <div id="sdk-hook"></div>
    </body>
</html>
```

After setting the `sdkToken` you will see the following page on your html.
![Init Error Page](https://tpastream-public.s3.amazonaws.com/sdk-docs/quickstart-screenshots/error-init-page.png)

That is ok! In order to initialize the SDK you will need to have quite a few more values. So for now it won't properly init.

If you go into the developer tools for your site, you can get several helpful errors from the various requests which the SDK
is generating. In this case the following init errors will likely provide `422` responses.

Example Error:
```
You are missing required parameters in user. We require [firstName, lastName, email]. For more documentation on how the User Configuration works see https://github.com/TPAStream/stream-connect-js-sdk/blob/master/docs/client-usage.md#client-usage
```

If you recieve a `404` error at this step it is possible that your `sdkToken` is not configured properly. Stick with the guide to see
if the error naturally resolves as you add the rest of the configuration.

## Step 4 -- Add user configuration
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://app.tpastream.com/static/js/sdk.js"></script>
        <script>
            window.StreamConnect({
                el: '#sdk-hook',
                isDemo: false,
                sdkToken: 'Your-SDK-Token-Here',
                user: {
                    firstName: 'Testing',
                    lastName: 'User',
                    email: 'youremail+testingsdk@email.com'
                },
            })
        </script>
    </head>
    <body>
        <div id="sdk-hook"></div>
    </body>
</html>
```

An implementor can think of a user as a participant which has the credentials on whatever insurance carrier is being interacted with.
In order to save these members into our system we require a first name, last name, and an email. While eventually this data will
come from real user data on your site, while configurating the sdk we suggest you use test emails.

*Warning* If you have an Admin account on TPAStream you will not be able to use that account with the StreamConnect SDK. Instead use
a different email with your enrollment process. Or if you are using GMail, you can follow the pattern `youremail+testingsdk@gmail.com`.
This will allow you to set-up a new account in TPAStream which is separate from your current one, but also have the emails go to
your current email.

## Step 5 -- Employer configuration
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="https://app.tpastream.com/static/js/sdk.js"></script>
        <script>
            window.StreamConnect({
                el: '#sdk-hook',
                isDemo: false,
                sdkToken: 'Your-SDK-Token-Here',
                user: {
                    firstName: 'Testing',
                    lastName: 'User',
                    email: 'youremail+testingsdk@email.com'
                },
                employer: {
                    name: 'testingEmployer', // Only provide this if your employer does not exist in TPAStream yet.
                    systemKey: 'testing-sdk',
                    vendor: 'internal', // This will almost always be internal
                },
            })
        </script>
    </head>
    <body>
        <div id="sdk-hook"></div>
    </body>
</html>
```

When implementing the SDK all carrier credentials will be nested under an employer in TPAStream. This block will define which
employer your are interested in.

To get the Key for an existing employer go to the [Employers Page](https://app.tpastream.com/b/employers) in the TPAStream Admin portal. From there search up the desired employer. Then enter the details page of said employer. From there navigate to the **support** tab.

You will see a screen similar to this:
![Employer Key Page](quickstart-screenshots/employer-key-page.png)

You will see `Internal Key` as a section. Grab the key directly across from that and put it into the systemKey config option in the employer object. In this case it is highleted and called `testing-sdk`.


# Step 6 -- Init

Now that you have set up the configuration as follows you should be able to reload the page you set up before and init the SDK. From 0.8 onward the SDK ships with a polished default appearance, so you should see a usable enrollment widget without any host-page CSS work.

For brand-color matching see [Theme](./theme.md). For the per-callback contract and the full list of init options see [Client Usage](./client-usage.md). If you're coming from 0.7.x, the [Migration guide](./migration-0.7-to-0.8.md) calls out the handful of behaviors that changed.

## Mobile (Android, iOS, React Native)

The SDK is web-first. The recommended mobile integration pattern is to embed the SDK page in a WebView and ferry callbacks to the native host via `postMessage` / message handlers. This gives the mobile app the polished 0.8 UI for free without a parallel native codebase.

### React Native

[`react-native-webview`](https://github.com/react-native-webview/react-native-webview) is the standard library:

```jsx
import { WebView } from 'react-native-webview';

export const ConnectScreen = ({ onComplete }) => {
  const handleMessage = (event) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === 'doneEasyEnroll') {
      onComplete(message.data);
    }
  };

  return (
    <WebView
      source={{ uri: 'https://your-backend.example.com/connect-sdk' }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
    />
  );
};
```

Your `/connect-sdk` page should host the standard SDK init from Step 5 above, plus a `postMessage` forwarder so terminal-state callbacks reach the native shell:

```html
doneEasyEnroll: (data) => {
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: 'doneEasyEnroll', data })
  );
}
```

Full RN walkthrough including PAA-redirect handling is in [`sdk-hook/docs/README.md`](../sdk-hook/docs/README.md#recommended-webview-pattern-for-react-native).

> **Note on `stream-connect-sdk-hook`**: the separate headless hook package on npm (v0.6.x) is deprecated in favor of the WebView pattern above. Existing integrations keep working but won't receive feature updates. See the hook docs for the deprecation notice and migration guidance.

### Android (Java)

```java
public class ViewWeb extends Activity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.content);
        WebView webview = (WebView) findViewById(R.id.webView);
        webview.getSettings().setJavaScriptEnabled(true);
        webview.loadUrl("https://your-backend.example.com/connect-sdk");
    }
}
```

### iOS (Swift / WKWebView)

```swift
import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    @IBOutlet weak var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.uiDelegate = self
        webView.navigationDelegate = self
        let url = URL(string: "https://your-backend.example.com/connect-sdk")!
        webView.load(URLRequest(url: url))
    }
}
```
