/**
 * @module bet-dubs-action Response generator for `dabs bet-dubs` command
 */
// eslint-disable-next-line no-unused-vars
import { Client } from 'discord.js'
import '../../../typedefs.js'
import generateEmbedTemplate from '../../../utils/generateEmbedTemplate.js'
import {
  emojiNumbers,
  readUser,
  saveUser,
  validateGambleInput
} from '../utils.js'
import { checkGambleBadges } from '../badges.js'

function doGamble (amount) {
  const number = Math.floor(Math.random() * 1000000)
  const roll = `00000${number}`.slice(-6)
  let dubs = 0
  for (let c = 5; c > 0; c--) {
    if (roll[c] === roll[c - 1]) dubs += 1
    else break
  }
  const flavour = [
    '*Singles, no payout.*',
    '*Dubs!*',
    '**Trips!**',
    '**QUADS!**',
    '***QUINTUPLES!!!***',
    '***S E X T U P L E S ! ! !***'
  ][dubs]
  const winnings = [
    0,
    amount * 5,
    amount * 20,
    amount * 50,
    amount * 500,
    amount * 5000
  ][dubs]
  const description = [
    emojiNumbers(roll),
    flavour,
    `Winnings: **${winnings}**`
  ].join('\n')
  return [description, winnings]
}

/**
 * Enum for InteractionResponseType values.
 * @readonly
 * @enum {number}
 */
const CommandOptionType = {
  Pong: 1, // ACK a Ping
  Acknowledge: 2, // ACK a command without sending a message, eating the user's input
  ChannelMessage: 3, // respond with a message, eating the user's input
  ChannelMessageWithSource: 4, // respond with a message, showing the user's input
  AcknowledgeWithSource: 5 // ACK a command without sending a message, showing the user's input
}

/**
 * Respond to command trigger
 * @param {Client} client - bot client
 * @param {Interaction} interaction - interaction that triggered the command
 * @returns {InteractionResponse} interaction to send back
 */
export default async function (client, interaction) {
  const embed = await generateEmbedTemplate(client, interaction)
  let amount = interaction.data.options[0].options[0].value
  const userID = interaction.member.user.id
  const user = readUser(userID)

  if (amount === 0) amount = user.dabs
  embed.title = `Bet dubs: ${amount}`
  const error = validateGambleInput(amount, user.dabs)
  if (error == null) {
    const [description, winnings] = doGamble(amount)

    embed.description = description

    user.dabs -= amount
    user.dabs += winnings
    user.highestDabs = Math.max(user.highestDabs, user.dabs)
    user.lowestDabs = Math.min(user.lowestDabs, user.dabs)
    user.betTotal += Math.abs(amount)
    user.betWon += Math.abs(winnings)
    const { badges, messages } = checkGambleBadges(user, amount, winnings)
    if (badges.length !== 0) {
      for (const badge of badges) user.badges.push(badge)
      embed.fields.push({
        name: '**Badges earned:**',
        value: messages.join('\n')
      })
    }
    user.badges = user.badges.sort()
    saveUser(userID, user)
  } else {
    embed.description = error
    embed.color = 0xff0000
  }
  return {
    type: CommandOptionType.ChannelMessage,
    data: { embeds: [embed] }
  }
}
