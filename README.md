# Cabal-Discord Bridge

You can use this tool, to automatically send messages from Cabal to Discord and vice-versa.

## Steps to Run

- Clone the repository
- Create a config (see the config section)
- Add Discord bot to server, and give it a role with 'Manage Webhooks' permission
- Run `node index`

## Config

For this bridge to work, a `config.json` file must exist at the application root. You can take a look at `config.example.json` to see how this file is structured.

#### cabalKey

This is the key of the cabal that you want to bridge.

#### discordSecret

This is a token for a Discord bot. Take a look at [https://discord.com/developers/docs/intro] to see how to create a bot. The bridge will work on all severs that you add this bot to.

#### mappings

This array defines how messages should be passed between Cabal and Discord.

```js
"discord": [] // Array of Discord channels for this mapping
"cabal": [] // Array of Cabal channels for this mapping
"from": "cabal" || "discord" || "both" // Defines the direction in which messages should be bridged
```

#### logging

Set to `true` or `'info'`, to display forwarded messages along with meta information in console. Set it to `'debug'` to also display information about recieved events.
