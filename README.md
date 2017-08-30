# Connect-Four-Chatbot
This is my connect four chat bot developed with Node.js using the Microsoft Bot Framework.

Prerequisites:

1. Install Node.js.
2. Install the SDK:
  2.1 Use the command "npm install --save botbuilder" in CMD.
  2.2 Use the command "npm install --save restify" in CMD.
3. Install the bot emulator: https://emulator.botframework.com/

------------------------------------------------------------------------------------------------------------------------------------

Instructions:
1. Download this folder.
2. Open windows command prompt.
3. Navigate to the folder you just downloaded.
4. Use the command "node app.js"
5. Open the bot emulator.
6. Connect with "http://localhost:3978/api/messages" (Microsoft App ID and Microsoft App Password can be left black).
7. Say hello.
8. Follow the bot from then on (or refer to the how to play section).

------------------------------------------------------------------------------------------------------------------------------------

How to Play:
1. After saying hello, the bot will ask if you wish to play.
2. Respond "Yes" if you want to play, "No" if you don't, and "Help" if you want help.
3. In order to make your move, simply state the column number you wish to enter your chip in.
  3.1 Your chips are represented by a "Y" (yellow chips).
  3.2 The computer's chips are represented by "R" (red chips).
  3.3 Empty spaces are represented by "E".
4. You can win by getting 4 in a row horizontally, vertically, or diagonally
5. If you wish to restart, type "Restart" and then type "Yes".

------------------------------------------------------------------------------------------------------------------------------------

Misc:
1. "Help" can be asked for at any time from within the bot.
2. "Restart" can be used to restart the game at any time, after the first move. 
3. Your responses are case insensitive.


Thank you, and I hope you enjoy.

