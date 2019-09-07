# Pony Town

A game of ponies building a town

## Prerequisites

* [Node.js](https://nodejs.org/download/release/v9.11.2/) (version 9)
* gulp `npm install -g gulp`
* MongoDB: [download link](https://www.mongodb.com/download-center/community) and [installation instructions](https://docs.mongodb.com/manual/administration/install-community/)
* [ImageMagick](https://imagemagick.org/script/download.php#windows) (optional, required for generating preview gifs in animation tool)

## Installation

```bash
npm install
```

## Setting up Database

- Install MongoDB
- Start `mongo` from command line (you may need to go to `C:\Program Files\MongoDB\Server\4.0\bin` path on windows to run the command)
- Type `use your_database_name` to create database
- Type `db.new_collection.insert({ some_key: "some_value" })` to initialize database
- Type
  ```javascript
  db.createUser(
    {
      user: "your_username",
      pwd: "your_password",
      roles: [ { role: "readWrite", db: "your_database_name" } ]
    }
  )
  ```
  to create database user.
- Type `quit()` to exit mongo

## Setting up OAuth keys

Get OAuth keys for authentication platform of your choice (github, google, twitter, facebook, vkontakte, patreon)

### Github

- Go to https://github.com/settings/developers create new OAuth app.
- Set authorization callback URL to `http://<your domain>/auth/github/callback` or `http://localhost:8090/auth/github/callback` for localhost server.
- Add this to `oauth` field in your `config.json`

```json
"github": {
  "clientID": "<your_client_id>",
  "clientSecret": "<your_client_secret>"
}
```

### Twitter

- Go to https://developer.twitter.com/en/apps create new app.
- Set callback URL to `http://<your domain>/auth/twitter/callback` or `http://localhost:8090/auth/twitter/callback` for localhost server.
- Add this to `oauth` field in your `config.json`

```json
"twitter": {
  "consumerKey": "<your_consumer_key>",
  "consumerSecret": "<your_consumer_secret>"
}
```

### Google

- Go to https://console.developers.google.com/apis/dashboard create new project from dropdown at the top, go to credentials and create new entry.
- Add to Authorized JavaScript origins `http://<your domain>` or `http://localhost:8090/` for localhost server.
- Add to Authorized redirect URIs `http://<your domain>/auth/google/callback` or `http://localhost:8090/auth/google/callback` for localhost server.
- Add this to `oauth` field in your `config.json`

```json
"google": {
  "clientID": "<your_client_id>",
  "clientSecret": "<your_client_secret>"
}
```

### Facebook

- Go to https://developers.facebook.com/apps/ add a new app.
- Add "Facebook Login" product to your app
- Enable "Web OAuth Login"
- Add `https://<your domain>/auth/facebook/callback` to Valid OAuth Redirect URIs
- Add this to `oauth` field in your `config.json` (You can find App ID and App Secret in Settings > Basic section)

```json
"facebook": {
  "clientID": "<your_app_id>",
  "clientSecret": "<your_app_secret>",
  "graphApiVersion": "v3.1"
}
```

### VKontakte

- Go to https://vk.com/apps?act=manage and create new app
- Set Authorized redirect URI to `http://<your domain>/auth/vkontakte/callback` or `http://localhost:8090/auth/vkontakte/callback` for localhost server.
- Add this to `oauth` field in your `config.json`

```json
"vkontakte": {
  "clientID": "<your_app_id>",
  "clientSecret": "<secure_key>"
},
```

### Other

If you want to add other sign-in methods you need to find appropriate [passport](http://www.passportjs.org/) package and add it in `src/ts/server/oauth.ts` and add correct entry in `config.json`.

## Configuration

Add `config.json` file in root directory with following content. You can use `config-template.json` as a starting point for your own config. (do not include comments in your `config.json` file)

```javascript
{
  "title": "Pony Town",
  "twitterLink": "https://twitter.com/<twitter_name>", // optional
  "contactEmail": "<your_contact_email>",
  "port": 8090,
  "adminPort": 8091,
  "host": "http://localhost:8090/",
  "local": "localhost:8090",
	"adminLocal": "localhost:8091",
  "secret": "<some_random_string_here>",
  "token": "<some_random_string_here>",
  "db": "mongodb://<username>:<password>@localhost:27017/<database_name>", // use values you used when setting up database
  "analytics": { // optional google analytics
    "trackingID": "<tracking_id>"
  },
  "facebookAppId": "<facebook_id>", // optional facebook app link
  "assetsPath": "<path_to_graphics_assets>", // optional, for asset generation
  "oauth": {
		"google": {
			"clientID": "<CLIENT_ID_HERE>",
			"clientSecret": "<CLIENT_SECRET_HERE>"
		}
    // other oauth entries here
  },
  "servers": [
    {
      "id": "dev",
      "port": 8090,
      "path": "/s00/ws",
      "local": "localhost:8090",
      "name": "Dev server",
      "desc": "Development server",
      "flag": "test", // optional flag ("test", "star" or space separated list of country flags)
      "flags": { // optional feature flags
        "test": true, // test server
        "editor": true, // in-game editor
      },
      "alert": "18+", // optional 18+ alert (also blocks underage players)
    },
  ]
}
```

## Running

Production environment

```bash
npm run build
npm start
```

Adding/removing roles

```bash
node cli.js --addrole <account_id> <role>   # roles: superadmin, admin, mod, dev 
node cli.js --removerole <account_id> <role>
```

To setup superadmin role use following command

```bash
node cli.js --addrole <your_account_id> superadmin
```

Admin panel is accessible at `<base_url>/admin/` (requires admin or superadmin role to access)
Tools are accessible at `<base_url>/tools/` (only available in dev mode or when started with --tools flag)

Starting as multiple processes

```bash
node pony-town.js --login                    # login server
node pony-town.js --game main                # game server 1 ('main' has to match id from config.json)
node pony-town.js --game safe                # game server 2 ('safe' has to match id from config.json)
node pony-town.js --admin --standaloneadmin  # admin server
```

For these to work on the same URL, paths to game servers and admin server need to be bound to correct ports, using http proxy.

It is recommended to run processes with larger memory pool for large user bases (especially admin and game processes), example:

```bash
node --max_old_space_size=8192 pony-town.js --game main
```

Beta environment (with dev tools and in-development features)

```bash
npm run build-beta
node pony-town.js --login --admin --game --tools --beta
```

Running in development

```bash
npm run ts-watch    # terminal 1
npm run wds         # terminal 2
gulp dev            # terminal 3
gulp test           # terminal 4 (optional)
```

```bash
gulp dev --sprites  # run with generation of sprite sheets (use src/ts/tools/trigger.txt to trigger sprite generation without restarting gulp)
gulp dev --test     # run with tests
gulp dev --coverage # run with tests and code coverage
```

## Customization

- `package.json` - settings for title and description of the website
- `assets/images` - logos and team avatars
- `public/images` - additional logos
- `public` - privacy policy and terms of service
- `favicons` - icons
- `src/ts/common/constants.ts` - global settings
- `src/ts/server/maps/*` - maps configuration and setup
- `src/ts/server/start.ts` - world setup
- `src/ts/components/services/audio.ts` - adding/removing sound tracks
- `src/ts/client/credits` - credits and contributors
- `src/style/partials/_variables.scss` - page style configuration

### Custom map introduction

- `src/ts/server/start.ts:35` - adding custom map to the world
- `src/ts/server/map/customMap.ts` - commented introduction to customizing maps
