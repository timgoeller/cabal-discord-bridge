# Cabal-Discord Bridge
You can use this tool, to automatically send messages from Cabal to Discord and vice-versa. 

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