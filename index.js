var CabalBot = require('cabal-bot-core')
var pipeline = require('cabal-bot-pipeline')
const Discord = require('discord.js')

const fs = require('fs')

try {
  var config = JSON.parse(fs.readFileSync('config.json'))
} catch {
  throw new Error('Error while parsing config, make sure config.js exists')
}

const discordBot = new Discord.Client()

const cabalBot = new CabalBot('discord-bridge')

discordBot.on('ready', () => {
  discordBot.on('message', msg => {
    const cabalChannelsToForwardTo = new Set()
    config.mappings.forEach(mapping => {
      if (mapping.discord.includes('*') || mapping.discord.includes(msg.channel.name)) {
        mapping.cabal.forEach(cabalMapping => cabalChannelsToForwardTo.add(cabalMapping))
      }
    })
    cabalBot.broadcast(cabalChannelsToForwardTo, msg.content)
  })
})

cabalBot.joinCabal(config.cabalKey)
discordBot.login(config.discordSecret)
