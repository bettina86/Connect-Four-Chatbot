//REMOVE message being sent, make playersTurn = true if it's their turn, - in fact rewrite that. Fix layout.

var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);
var defaultLayout = "#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE"; //defines the default board state. This shouldn't change, but it in theory could.
var layout; //"#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE#EEEEEEE" is the default board state, in case it is accidently changed.
var isGameOver;
var messageSent;
var firstTurn;
var playersTurn; //defines varible global variables that are used in the program.
var replaced;
var computerMove;
var winner;
var endingReason;
var endingReasonArray = [];
var gameEndMessage;
var playerResponse;
var chosenDialog;
var difficulty;
var informedMove;
var triedInformedMove;
var scenario;


bot.dialog('/', [ //dialog that is called in response to any sort of messsage at the start of the program.
  function (session) {
        session.send("Welcome to Simon Perryman's chatbot. I know how to play four in a row."); //initial welcome message.
        builder.Prompts.text(session, 'Would you like to play? Answer Yes to play!'); //question asking them if they'd like to play.
  },
  function (session, results) {
      playerResponse = results.response.toLowerCase(); //sets the response to the question "Would you like to play" to lowercase, so it wouldn't matter if they type "Yes", "yes", "YES" etc.

        switch(playerResponse){
          case 'yes':
            session.beginDialog('difficultySelect'); //if they said they want to start the game, the system brings them to the dialog for starting the game.
            break;
          case 'help':
            session.beginDialog('helpStart'); //opens up the "helpStart" dialog if the user responds "help" - note the help and helpStart dialogs are slightly different.
            break;
          case 'no':
            session.endDialog('Ok, maybe next time!'); //if the user replies No the bot responds and ends the dialog.
            break;
          default:
            session.beginDialog('incorrectInputStart'); //if the user enters something that isn't yes, no or help they are brought to the incorrectInputStart dialog.
        }

  }
]);

bot.dialog('difficultySelect', [ //dialog to choose the AI difficulty.
  function(session){
    builder.Prompts.text(session, "What difficulty would you like? Easy, Medium or Hard?");
  },
  function(session, results){
    playerResponse = results.response.toLowerCase();

    switch(playerResponse){
      case "easy":
        difficulty = "Easy";
        session.beginDialog('startGame');
        break;
      case "medium":
        difficulty = "Medium";
        session.beginDialog('startGame');
        break;
      case "hard":
        difficulty = "Hard";
        session.beginDialog('startGame');
        break;
      default:
        session.beginDialog('invalidDifficulty'); //if they didn't enter a difficulty, take them to the invalidDifficulty dialog.
    }

  }
]);

bot.dialog('invalidDifficulty', [
  function(session){
    builder.Prompts.text(session, "That was an invalid difficulty. What difficulty would you like? Easy, Medium or Hard?");
  },
  function(session, results){
    playerResponse = results.response.toLowerCase();

    switch(playerResponse){
      case "easy":
        difficulty = "easy";
        session.beginDialog('startGame');
        break;
      case "medium":
        difficulty = "medium";
        session.beginDialog('startGame');
        break;
      case "hard":
        difficulty = "hard";
        session.beginDialog('startGame');
        break;
      default:
        session.beginDialog('invalidDifficulty'); //if they didn't enter a difficulty, loop this dialog.
    }
  }
]);


bot.dialog('startGame', function(session){

    stateSetter(); //sets all the variables to be correct for the start of the game (needed in case the user restarts). Examples are "layout = defaultLayout" and "isGameOver = false".

    if(Math.random() < 0.5){ //"dice roll" to see who goes first.
      session.send("Congratulations, you go first.") //if the "dice" rolls less than 0.5 the player gets to go first.
      playersTurn = true;
    }
    else{
      session.send("Unlucky, I'm going first.") //if the "dice" rolls more than 0.5 the computer goes first.
    }


    if(playersTurn){ //if the player got to go first.
      layoutDisplay(); //work out the layout of the board.
      session.send(displayFormat); //display the layout of the board.
      session.beginDialog('playerTurn'); //begin the the dialog for the player's turn.
    }
    else{
      session.beginDialog('computerTurn'); //if its the computers turn, begin the dialog of the computer's turn - note I haven't displayed the board here, because it gets displayed at the end of the computer's turn.
    }
});

bot.dialog('playerTurn', [ //dialog for the player's turn.
    function (session){

        rules(); //checks the rules. If someone has won, or the game is a draw, the "isGameOver" will be set to true.
        if(!isGameOver){ //if the game isn't over.
        builder.Prompts.text(session, "Where would you like to go?"); //asks the player where they would like to go.
      }
      else{ //if the game is over.
        layoutDisplay(); //get the end board state.
        session.send(displayFormat); //display the end board state.
        session.endDialog(gameEndMessage); //display the reason(s) why the game ended and who won.
      }
    },
  function(session, results){

        playerResponse = results.response; //assigns the variable playerResponse the players response to "Where would you like to go".
        dialogChooser(); //Function that decides what the player responded with, and how to deal with it (different decisions will bring up different dialogs, e.g. "help" will bring up a different dialog to if they replied a column number. This is also where the program checks to see if the column the player is trying to go in is full.
        session.beginDialog(chosenDialog); //sets the next dialog to the one chosen as a result of the players response.
  }
]);

bot.dialog('computerTurn', function (session){ //dialog for the computers turn.
    rules(); //checks the rules. If someone has won, or the game is a draw, the "isGameOver" will be set to true.
    if(!isGameOver){ //if the game isn't over.
    computersGeneratedMove(); //the computer generates and then plays a move.
    layoutDisplay(); //work out the new layout of the board.
    session.send("The computer placed a chip in column %s.", computerMove); //tell the user where the computer played (in case they can't see where the computer went).
    session.send(displayFormat);//display the new layout of the board.
    session.beginDialog('playerTurn'); //starts the dialog for the players turn..
  }else{ //if the game is over.
    layoutDisplay(); //get the end board state.
    session.send(displayFormat); //display the end board state.
    session.endDialog(gameEndMessage); //display the reason(s) why the game ended and who won.
  }
});

bot.dialog('acceptedMove', function(session){ //if the move the user makes is valid (i.e. they can place the chip in the spot they chose).
  session.send("You placed a chip in column %s.", playerResponse); //tell the user they placed the chip in the column they chose.
  session.beginDialog('computerTurn'); //start the computer's turn.
});

bot.dialog('columnFull', [ //if the column was full (when the user chose the column).
  function(session){
    session.send(displayFormat); //display the layout of the board
    builder.Prompts.text(session, 'That column is Full! Please enter a different column!'); //tell the user the column was full, ask them for a different column.
  },
  function(session, results){
    playerResponse = results.response; //assign the response of the question the variable "playerResponse".
    dialogChooser(); //Function that decides what the player responded with, and how to deal with it.
    session.beginDialog(chosenDialog); //Using the above function, the next dialog will open up (depending on what the user responded with).
  }
]);

bot.dialog('help', [ //dialog for if the user asks for help as a response.
  function(session){
    session.send("This is Simon Perryman's Connect Four chatbot.\n\nI will display the board, in order for you to place a chip somewhere, please enter a number between 1 and 7 (which corresponds to a column) in order to move.\n\n If you would like to restart, please enter 'restart'.\n\nIf you need help at any time just enter 'help'. I hope that helps."); //help message.
    session.send(displayFormat); //displays the board's layout/state.
    builder.Prompts.text(session, "What column would you like to place a chip in?\n\n Please answer 1-7."); //asks the user.
  },
  function(session, results){
    playerResponse = results.response; //assigns the variable playerResponse the players response to the above question.
    dialogChooser(); //Function that decides what the player responded with, and how to deal with it.
    session.beginDialog(chosenDialog); //Using the above function, the next dialog will open up (depending on what the user responded with).
  }
]);

bot.dialog('helpStart', [
  function(session){
    session.send("This is Simon Perryman's Connect Four chatbot.\n\nIf you would like to play, please enter 'yes'.\n\nWhen we are playing the game, I will display the board, in order for you to place a chip somewhere, please enter a number between 1 and 7 (which corresponds to a column) in order to move.\n\n If you would like to restart, at any time after you've started, please enter 'restart'.\n\nIf you need help at any time just enter 'help'. I hope that helps."); //help message
    builder.Prompts.text(session, "Would you like to play?"); //ask them again if they would like to play.
  },
  function(session, results){
    playerResponse = results.response.toLowerCase(); //assigns the variable playerResponse the players response to the above question.

      switch(playerResponse){
        case 'yes':
          session.beginDialog('difficultySelect'); //if they say yes start the game
          break;
        case 'help':
          session.beginDialog('helpStart'); //if they ask for help again, loop this
          break;
        case 'no':
          session.endDialog('Ok, maybe next time!'); //if  they say no, end the dialog.
          break;
        default:
          session.beginDialog('incorrectInputStart'); //if they answer something that I didn't specify, take them to the incorrectInputStart dialog.
      }
  }
]);

bot.dialog('restart', [ //dialog for restarting
  function(session){
    builder.Prompts.text(session, "Are you sure you want to restart? Please resond Yes if you wish to restart and No if you don't."); //confirmation in case they change their mind.
  },
  function(session, results){
    playerResponse = results.response.toLowerCase();
    if(playerResponse == 'yes'){
      session.send("Ok let's restart the game.");
      session.beginDialog('difficultySelect'); //if yes tells them they restarted, and runs the startGame dialog (this will reset variables to their default values - e.g. layout = defaultLayout).
    }else if(playerResponse == 'no'){
      session.beginDialog('newPlayerResponse'); //if they say no, brings them to the newPlayerResponse
    }else{
      session.beginDialog('restartLoop'); //this is in case they give a response that is not yes or no. I want to repeat the question, but inform the user they entered something that the program couldn't process.
    }
  }
]);

bot.dialog('restartLoop', [ //this is in case they give a response that is not yes or no. I want to repeat the question, but inform the user they entered something that the program couldn't process.
  function(session){
    builder.Prompts.text(session, "Sorry I'm not sure how to process what you just said. \n\nAre you sure you want to restart? \n\nPlease resond Yes if you wish to restart and No if you don't. ");
  },
  function(session, results){
    playerResponse = results.response.toLowerCase();
    if(playerResponse == 'yes'){
      session.send("Ok let's restart the game."); //if yes tells them they restarted, and runs the startGame dialog (this will reset variables to their default values - e.g. layout = defaultLayout).
      session.beginDialog('difficultySelect');
    }else if(playerResponse == 'no'){
      session.beginDialog('newPlayerResponse'); //if they say no, brings them to the newPlayerResponse
    }else{
      session.beginDialog('restartLoop'); //loop back around if they don't enter yes or no.
    }
  }
]);

bot.dialog('tryAgain', [ //This dialog is called when the user responds to which column they want to use and they don't respond with a column number, help, or restart.
  function(session){
    session.send(displayFormat); //displays the current board layout/state.
    builder.Prompts.text(session, "That wasn't a valid input! Please enter a column number (1-7)!"); //tells them what they put wasn't valid. Asks them to enter a column number again.
  },
  function(session, results){
    playerResponse = results.response; //assigns the variable playerResponse the players response to the above question.
    dialogChooser(); //Function that decides what the player responded with, and how to deal with it.
    session.beginDialog(chosenDialog); //Using the above function, the next dialog will open up (depending on what the user responded with).
  }
]);

bot.dialog('newPlayerResponse', [ //This dialog is called if the user decides that they don't want to restart the game. It allows them to enter a new response.
  function(session){
    session.send(displayFormat);
    builder.Prompts.text(session, "Where would you like to go?");
  },
  function(session, results){
    playerResponse = results.response; //assigns the variable playerResponse the players response to the above question.
    dialogChooser(); //Function that decides what the player responded with, and how to deal with it.
    session.beginDialog(chosenDialog); //Using the above function, the next dialog will open up (depending on what the user responded with).
  }
]);

bot.dialog('incorrectInputStart', [ //called before the game starts if the user responds to "Would you like to play?" with anything other than "yes", "no", or "help".
  function(session){
    builder.Prompts.text(session, "Sorry I'm not sure how to process what you just said. \n\nWould you like to play?"); //asks them again and tells them it couldn't process what they said.
  },
  function(session, results){
    playerResponse = results.response.toLowerCase(); //assigns the variable playerResponse the players response to the above question.

      switch(playerResponse){
        case 'yes':
          session.beginDialog('difficultySelect'); //if the response is "yes", starts the game.
          break;
        case 'help':
          session.beginDialog('helpStart'); //if they ask for help, then it will open the "helpStart" (help for before they begin the game) dialog.
          break;
        case 'no':
          session.endDialog('Ok, maybe next time!'); //if they respond no it will end the dialog.
          break;
        default:
          session.beginDialog('incorrectInputStart'); //if they enter something that wasn't "yes", "help", or "no" it will loop this dialog.
      }
  }
]);


function rules(){ //this function decides whether the game is over.

  if(layout.includes("RRRR")){
    isGameOver = true;                //checks to see if the computer has 4 in a horizontal row.
    winner = "The computer";
    endingReason = "horizontally";
    endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
  }

  if(layout.includes("YYYY")){
    isGameOver = true;              //checks to see if the player has 4 in a horizontal row.
    winner = "You";
    endingReason = "horizontally";
    endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
  }

  for(var i=0; i<24;i++){
    if(layout.charAt(i) == "R" && layout.charAt(i + 8) == "R" && layout.charAt(i + 16) == "R" && layout.charAt(i + 24) == "R"){
      isGameOver = true;
      winner = "The computer";      //checks to see if the computer has 4 in a row vertically.
      endingReason = "vertically";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  for(var i=0; i<24;i++){
    if(layout.charAt(i) == "Y" && layout.charAt(i + 8) == "Y" && layout.charAt(i + 16) == "Y" && layout.charAt(i + 24) == "Y"){
      isGameOver = true;
      winner = "You";             //checks to see if the player has 4 in a row vertically.
      endingReason = "vertically";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  for(var i=4; i<45;i++){
    if(layout.charAt(i) == "R" && layout.charAt(i + 7) == "R" && layout.charAt(i + 14) == "R" && layout.charAt(i + 21) == "R"){
      isGameOver = true;
      winner = "The computer"; //checks to see if the computer has 4 in a row diagonally (in a positive gradient).
      endingReason = "diagonally";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  for(var i=4; i<45;i++){
    if(layout.charAt(i) == "Y" && layout.charAt(i + 7) == "Y" && layout.charAt(i + 14) == "Y" && layout.charAt(i + 21) == "Y"){
      isGameOver = true;
      winner = "You"; //checks to see if the player has 4 in a row diagonally (in a positive gradient).
      endingReason = "diagonally";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  for(var i=1; i<23;i++){
    if(layout.charAt(i) == "R" && layout.charAt(i + 9) == "R" && layout.charAt(i + 18) == "R" && layout.charAt(i + 27) == "R"){
      isGameOver = true;
      winner = "The computer"; //checks to see if the computer has 4 in a row diagonally (in a negative gradient).
      endingReason = "diagonally";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  for(var i=1; i<23;i++){
    if(layout.charAt(i) == "Y" && layout.charAt(i + 9) == "Y" && layout.charAt(i + 18) == "Y" && layout.charAt(i + 27) == "Y"){
      isGameOver = true;
      winner = "You";       //checks to see if the player has 4 in a row diagonally (in a negative gradient).
      endingReason = "diagonally";
      endingReasonArray.push(endingReason); //puts the reason for winning in an array. This is needed in case someone wins in more than one way.
    }
  }

  if(!isGameOver){ //If someone won and all the slots are filled I don't want the program to say someone won AND say it was a stalemate, so this is an easy check.
    if(!layout.includes("E")){
      isGameOver = true;
      winner = "Draw";    //checks if there are still valid moves left (i.e. if there are still empty (E) spaces).
      endingReason = "Stalemate";
    }
  }

  if(isGameOver){ //if the game is over, construct the message which says why the game is over and who won.
    gameEndMessageConstructor();
  }
}


function gameEndMessageConstructor(){ //function that creates the message that gets sent at the end of the game (saying who won and how).
  if(winner == "Draw"){
    gameEndMessage = "The game ended in a draw due to a stalemate. There are no more spaces to insert a chip."
  }
  else{ //if someone won.
    if(endingReasonArray.length == 1){ //if they won in just one way (e.g. horizontally).
        gameEndMessage = winner + " got four in a row " + endingReason + " and won the game. ";
    }
    else{ //if they won in more than one way (e.g. they insert a chip and the result is that they got 4 in a row horizontally and vertically).
        gameEndMessage = winner + " got four in a row ";
        for(var i=0; i<endingReasonArray.length;i++){ //this just loops through to make the sentence grammatically correct.
          if(i == 0){
            gameEndMessage += endingReasonArray[i];
          }
          else if(i != endingReasonArray.length-1){ //inserts a comma between every reason, unless it's the final reason for winning.
            gameEndMessage += ", ";
            gameEndMessage += endingReasonArray[i];
          }
          else{
            gameEndMessage += " & ";               //inserts an ampsersand if the reason being added is the final reason.
            gameEndMessage += endingReasonArray[i];
          }
        }
        gameEndMessage += " and won the game. "; //adds the final part of the message on.
    }
    if(winner == "You"){
      gameEndMessage += "Congratulations and thanks for playing."; //if the player won, it congratulates them.
    }
    else{
      gameEndMessage += "Unlucky and thanks for playing."; //if the player lost, it thanks them for playing.
    }
    gameEndMessage += " I'm going to shut down now, if you wish to play again just wake me!";
  }
  endingReasonArray.length = 0; //resets the array, so in future games the array is empty.
}

function stateSetter(){ //sets all the variables needed at the start of the game to be their correct value for the start of a game.
  layout = defaultLayout;
  isGameOver = false;
  messageSent = false;
  firstTurn = true;
  playersTurn = false;
  replaced = false;
  winner = "";
  endingReason = "";
  endingReasonArray.length = 0;
  informedMove = false;
  triedInformedMove = false;
  scenario = 1;
}

function dialogChooser(){ //Function that decides what the player responded with, and how to deal with it.
  replaced = false; //unlock the "locking system".
  if(playerResponse > 0 && playerResponse < 8){ //if the player entered a number (that would be one of the columns).
    for(var i=7; i<48; i=i+8){
      if(!replaced){ //if the lowest row in the column hasn't been found keep this "unlocked".
        if(layout.charAt( (layout.length-1) - (i - playerResponse) ) == "E"){ //find the lowerst row in the column chosen that is free (starting from the bottom).
          chosenDialog = 'acceptedMove'; //choose the dialog "acceptedMove" (when the user chose a column that they were able to place a chip into).
          tempArray = layout.split(""); //store the current board layout in an array.
          tempArray.splice( ((layout.length-1) - (i - playerResponse)), 1, "Y" ); //replace the empty space with a yellow disc (user's colour).
          layout = tempArray.join(); //make the board layout back into a string.
          layout = layout.replace(/,/g, ""); //remove the commas that appeared as a result of cutting the string into multiple elements in an array.
          replaced = true;//turn on the "lock" to stop it trying to find more rows once the lowest empty row in the column has been found.
        }
        else{
          chosenDialog = 'columnFull' //if it doesn't find an empty row for that column, it must be full, so set the chosenDialog to be columnFull. This will (via the dialogs) open the "columnFull" Dialog.
        }
      }
    }
  }
  else if(playerResponse.toLowerCase() == 'help'){ //if the user responds with "help", set the chosenDialog to help, which (via the dialogs) will open the help dialog.
    chosenDialog = 'help';
  }
  else if(playerResponse.toLowerCase()  == 'restart'){ //if the user responds with "restart", set the chosenDialog to help, which (via the dialogs) will open the restart dialog.
    chosenDialog = 'restart';
  }
  else{
    chosenDialog = 'tryAgain'; //if the user enters something that is invalid (i.e. anything but 1-7, help or restart) set the chosenDialog to "tryAgain". Using the dialogs, this will open the "tryAgain" dialog.
  }
}

function computersGeneratedMove(){ //move to generate the computer's turn.
  replaced = false; //at the start of the function ensure that the "lock" is unlocked (with the lock being the boolean "replaced", which is referenced later in the if statement.)



  if(difficulty == "Hard"  || difficulty == "Medium"){ //t will be the lock.
    while(!triedInformedMove){
      var rollNeeded3;
      var rollNeeded2;
      var roll = Math.random();

      if(difficulty == "Hard"){
        rollNeeded3 = 0.5;
        rollNeeded2 = 0.3;
      }else{
        rollNeeded3 = 0.7;
        rollNeeded2 = 0.5;
      }

      if(roll > rollNeeded3){
        cmCheck3v("R");
        cmCheck3h("R");
        cmCheck3pd("R");
        cmCheck3nd("R");

        cmCheck3v("Y");
        cmCheck3h("Y");
        cmCheck3pd("Y");
        cmCheck3nd("Y");
      }

      if(roll > rollNeeded2){
      cmCheck2h("R");
      cmCheck2v("R");
      cmCheck2pd("R");
      cmCheck2nd("R");

      cmCheck2h("Y");
      cmCheck2v("Y");
      cmCheck2pd("Y");
      cmCheck2nd("Y");
    }

      triedInformedMove = true; //for when the function loops again (for the uninformed part)
    }
  }
  if(!informedMove){
    computerMove = Math.floor((Math.random() * 7) + 1); //generates a column for the computer to place it's chip.
    if(layout.charAt(computerMove) != "E"){ //test to see if the column is full.
      computersGeneratedMove(); //if the column is full, run this function again (i.e. attempt to find a column that isn't full)
    }
    else{ //if the column isn't full
      for(var i=7; i<48; i=i+8){
        if( (layout.charAt( (layout.length-1) - (i - computerMove ) ) == "E" ) && !replaced ){ //check each row in that column to see if there is a red or yellow chip in that space (starting from the bottom). Check to see if the function already found a space for the computer's chip.
          tempArray = layout.split(""); //store the current board layout in an array.
          tempArray.splice( ((layout.length-1) - (i-computerMove)), 1, "R" ); //replace the empty space with a red chip (computer's colour).
          layout = tempArray.join(); //make the board layout back into a string.
          layout = layout.replace(/,/g, ""); //remove the commas that appeared as a result of cutting the string into multiple elements in an array.
          replaced = true; //tell the function that you have replaced a chip.
          message = false;
        }
      }
    }
  }
  triedInformedMove = false;
  informedMove = false;
}

function cmCheck3h(chip){
  var ePos;
  var chip1Pos;
  var chip2Pos;
  var eBelow;

  scenario = 1;

  while(scenario < 5){

    switch(scenario){ //four different scenarios. ERRR, RRRE, RERR, RRER (where R can be subsitute with Y).
      case 1: ePos = 3; chip1Pos = 1; chip2Pos = 2; eBelow = 11; break;
      case 2: ePos = -1; chip1Pos = 1; chip2Pos = 2; eBelow = 7; break;
      case 3: ePos = 1; chip1Pos = 2; chip2Pos = 3; eBelow = 9; break;
      case 4: ePos = 2; chip1Pos = 1; chip2Pos = 3;  eBelow = 10; break;
    }

    for(var i=1; i < (layout.length); i++){

      if( (layout.charAt(i) == chip && layout.charAt(i+chip1Pos) == chip && layout.charAt(i+chip2Pos) == chip) && layout.charAt(i+ePos) == "E" && !informedMove  ){
          if(i<41){
            if(layout.charAt(i+eBelow) == "R" || layout.charAt(i+eBelow) == "Y"){
              placeR(i+ePos);
              message = "3h" + chip;
            }
          }
          else{
            placeR(i+ePos);
            message = "3h" + chip;
          }
      }
    }
    scenario++;
  }

}

function cmCheck3v(chip){
  for(var i=26; i<layout.length;i++){
      if( (layout.charAt(i) == chip && layout.charAt(i - 8) == chip && layout.charAt(i - 16) == chip) && layout.charAt(i - 24) == "E" && !informedMove ){
            placeR(i-24);
      }
    }
}

function cmCheck3pd(chip){

  scenario = 1;
  var chip1Pos;
  var chip2Pos;
  var ePos;
  var eBelow;

  while(scenario < 5){


    switch(scenario){
      case 1: chip1Pos = -7; chip2Pos = -14; ePos = -21; eBelow = -13; break;
      case 2: chip1Pos = -7; chip2Pos = -21; ePos = -14; eBelow = -6; break;
      case 3: chip1Pos = -14; chip2Pos = -21; ePos = -7; eBelow = 1; break;
      case 4: chip1Pos = -7; chip2Pos = -14; ePos = 7; eBelow = 15; break;
    }

      for(var i=17; i<(layout.length-5); i++){
        if( (layout.charAt(i) == chip && layout.charAt(i + chip1Pos) == chip && layout.charAt(i + chip2Pos) == chip) && layout.charAt(i + ePos) == "E" && !informedMove ){
            if(layout.charAt(i+eBelow) == "R" || layout.charAt(i+eBelow) == "Y"){
              placeR(i+ePos);
            }
        }
      }
    scenario++;
  }
}

function cmCheck3nd(chip){

  scenario = 1;
  var ePos;
  var chip1Pos;
  var chip2Pos;
  var eBelow;

  while(scenario < 5){

  switch(scenario){
    case 1: ePos = -27; chip1Pos = -9; chip2Pos = -18; eBelow = -19; break;
    case 2: ePos = -18; chip1Pos = -9; chip2Pos = -27; eBelow = -10; break;
    case 3: ePos = -9; chip1Pos = -18; chip2Pos = -27; eBelow = -1; break;
    case 4: ePos = 9; chip1Pos = -9; chip2Pos = -18; eBelow = 17; break;
  }

    for(var i=19; i<layout.length; i++){
      if( layout.charAt(i) == chip && layout.charAt(i + chip1Pos) == chip && layout.charAt(i + chip2Pos) == chip && layout.charAt(i + ePos) == "E" && (layout.charAt(i + eBelow) == "R" || layout.charAt(i + eBelow) == "Y") && !informedMove ){
          placeR(i+ePos);
      }
    }
    scenario++;
  }
}

function cmCheck2h(chip){ //checks if there are 2 horizontal chips that could make a 3 in a row and, once as a 3 could make a 4 in a row.

  var chipPos;
  var e1Pos;
  var e2Pos;
  var e1Below;
  var e2Below;

  scenario = 1;

  while( scenario < 7 ){

    switch(scenario){ //6 different scenarios: RREE, RERE, REER, ERRE, ERER, EERR (originally figured out with Excel Document "Combinations.xlsx"
      case 1: chipPos = 1; e1Pos = 2; e2Pos = 3; e1Below = 10; e2Below = 11; break;
      case 2: chipPos = 2; e1Pos = 1; e2Pos = 3; e1Below = 9; e2Below = 11; break;
      case 3: chipPos = 3; e1Pos = 1; e2Pos = 2; e1Below = 9; e2Below = 10; break;
      case 4: chipPos = 1; e1Pos = -1; e2Pos = 2; e1Below = 7; e2Below = 10; break;
      case 5: chipPos = 2; e1Pos = -1; e2Pos = 1; e1Below = 7; e2Below = 9; break;
      case 6: chipPos = 1; e1Pos = -2; e2Pos = -1; e1Below = 6; e2Below = 7; break;
    }

    for(var i=1; i < (layout.length);i++){
        if( (layout.charAt(i) == chip && layout.charAt(i+chipPos) == chip) && (layout.charAt(i+e1Pos) == "E" && layout.charAt(i+e2Pos) == "E") && !informedMove){
          if(i<41){//checks if we're looking at the bottom row
             if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){ //if below the empty space e1Pos there are non empty spaces (so it it legal to place a chip there). In all cases I found, this play (e1Pos) was a better or equal play compared to the e2Below play.
               placeR(i+e1Pos);
             }
             else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){ //if below the empty space e2Below there are non empty spaces (so it it legal to place a chip there).
               placeR(i+e2Pos);
           }
         }
         else{//if we are looking at the bottom row we can't (and wouldn't need to) look at the row below it - in this case we just put a red chip ("R") in e1Pos
              placeR(e1Pos);
         }
        }
      }
      scenario++;
    }
}

function cmCheck2v(chip){
  for(var i=25; i<layout.length;i++){
    if(layout.charAt(i) == chip && layout.charAt(i-8) == chip && layout.charAt(i-16) == "E"){ //don't have to check the space two rows above, if you start on row.
      placeR(i-16);
      computerMove = i % 8;
    }
  }
}

function cmCheck2pd(chip){
  scenario = 1;
  var chipPos;
  var e1Pos;
  var e2Pos;
  var e1Below;
  var e2Below;

  while(scenario < 7){
    switch(scenario){
      case 1: chipPos = -7; e1Pos = 7; e2Pos = -14; e1Below = 15; e2Below = -6; break;
      case 2: chipPos = -14; e1Pos = -7; e2Pos = -21; e1Below = 1; e2Below = -13; break;
      case 3: chipPos = -7; e1Pos = -14; e2Pos = -21; e1Below = -6; e2Below = -13; break;
      case 4: chipPos = -21; e1Pos = -7; e2Pos = -14; e1Below = 1; e2Below = -6; break;
      case 5: chipPos = -14; e1Pos = 7; e2Pos = -7; e1Below = 8; e2Below = 1; break;
      case 6: chipPos = -7; e1Pos = 14; e2Pos = 7; e1Below = 22; e2Below = 15; break;
    }
    for(var i=4;i<layout.length-4;i++){
      if(layout.charAt(i) == chip && layout.charAt(i+chipPos) == chip && layout.charAt(i+e1Pos) == "E" && layout.charAt(i+e2Pos) == "E" && !informedMove){
        if(scenario == 1){ //i=19
          if(i > 33){ //if bottom row, the higher one will be better.
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i + e2Pos);
            }else{
              placeR(i + e1Pos);
            }
          }else if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
            placeR(i + e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
            placeR(i + e2Pos);
          }
        }

        else if(scenario == 2 || scenario == 3){ //in all scenarios the E in between the two R's is equal or better I found.
          if( (layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y")){
            placeR(i + e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
            placeR(i + e2Pos);
          }
        }
        else if(scenario == 4){

          if( (layout.charAt(i+e2Below) == "Y" || layout.charAt(i+e2Below) == "R") && layout.charAt(i-28) == "E" && !((layout.charAt(i+e1Below) == "Y" || layout.charAt(i+e1Below) == "R") && layout.charAt(i+7) == "E") ){ //if there is not an empty space further down the diagonal (outside the intended play) AND there is an empty space further up the diagonal (outside the intended play) AND we can play at the higher up E, place at the higher up E. If not, place at the lower down E.
            placeR(i + e2Pos);
          }else if(layout.charAt(i+e1Below) == "Y" || layout.charAt(i+e1Below) == "R"){
            placeR(i + e1Pos);
          }
        }else if(scenario == 5){ //in all scenarios the E in between the two R's is equal or better I found. EQUATE FOR BOTTOM ROW.
          if(i>33){ //if bottom row
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i + e2Pos);
            }else{
              placeR(i + e1Pos);
            }
          }else{
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i + e2Pos);
            }else if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
              placeR(i + e1Pos);
            }
          }
        }else if(scenario == 6){
            if(i > 26){//if second e is going to be on the bottom row
              if(layout.charAt(i + e1Below) == "R" || layout.charAt(i + e1Below) == "Y"){
                placeR(i + e1Pos);
              }else{
                placeR(i + e2Pos);
              }
            }else{ //if not bottom row
              if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
                placeR(i + e2Pos);
              }else if(layout.charAt(i + e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
                placeR(i + e1Pos);
              }
            }
        }
      }
    }
    scenario++;
  }
}

function cmCheck2nd(chip){
  scenario = 1;
  var chipPos;
  var e1Pos;
  var e2Pos;
  var e1Below;
  var e2Below;

  while(scenario < 7){

    switch(scenario){
      case 1: chipPos = -9; e1Pos = 9; e2Pos = -18; e1Below = 17; e2Below = -10; break;
      case 2: chipPos = -18; e1Pos = -9; e2Pos = -27; e1Below = -1; e2Below = -19; break;
      case 3: chipPos = -9; e1Pos = -18; e2Pos = -27; e1Below = -10; e2Below = -19; break;
      case 4: chipPos = -27; e1Pos = -9; e2Pos = -18; e1Below = -1; e2Below = -10; break;
      case 5: chipPos = -18; e1Pos = 9; e2Pos = -9; e1Below = 17; e2Below = -1; break;
      case 6: chipPos = -9; e1Pos = 9; e2Pos = 18; e1Below = 17; e2Below = 26; break;
    }

    for(var i=10; i < layout.length; i++){
      if(layout.charAt(i) == chip && layout.charAt(i+chipPos) == chip && layout.charAt(i+e1Pos) == "E" && layout.charAt(i+e2Pos) == "E" && !informedMove){
        if(scenario == 1){
          if(i > 34){//bottom row
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i+e2Pos);
            }
            else{
              placeR(i+e1Pos);
            }
          }
          else if((layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y") && !(layout.charAt(i+e2Pos-9) == "E" && (layout.charAt(i+e2Below) == "Y" || layout.charAt(i+e2Below) == "R"))){
              placeR(i+e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i+e2Pos);
          }
        }

        else if(scenario == 2){
          if( (layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y") && !(layout.charAt(i+e2Pos - 9) == chip && layout.charAt(i+e2Pos-18) == "E" && (layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y") ) ){
            placeR(i+e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
            placeR(i+e2Pos);
          }
        }

        else if(scenario == 3){
          if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
            placeR(i+e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
            placeR(i+e2Pos);
          }
        }

        else if(scenario == 4){
            if( (layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y") && !(layout.charAt(i+9) == chip && (layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y")) && !( i == 28 || i == 29 ) ){
              placeR(i+e2Pos);
            }else if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
              placeR(i+e1Pos);
            }
        }

        else if(scenario == 5){
          if(i > 34){
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i+e2Pos);
            }else{
              placeR(i+e1Pos);
            }
          }else if( (layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y") && !( layout.charAt(i+e1Pos+9) == chip && layout.charAt(i+e1+18) == "E" && (layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"))){
            placeR(i+e2Pos);
          }else if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
            placeR(i+e1Pos);
          }
        }

        else if(scenario == 6){
          if(i > 25){ //bottom
            if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
              placeR(i+e2Pos);
            }else{
              placeR(i+e1Pos);
            }
          }else if(layout.charAt(i+e1Below) == "R" || layout.charAt(i+e1Below) == "Y"){
            placeR(i+e1Pos);
          }else if(layout.charAt(i+e2Below) == "R" || layout.charAt(i+e2Below) == "Y"){
            placeR(i+e2Pos);
          }
        }
      }
    }
    scenario++;
  }
}

function placeR(position){
  //ALL EXAMPLES KEEP COMPUTER MOVE & MESSAGE
  tempArray = layout.split(""); //store the current board layout in an array.
  tempArray.splice( (position), 1, "R" ); //replace the empty space with a red chip (computer's colour).
  layout = tempArray.join(); //make the board layout back into a string.
  layout = layout.replace(/,/g, ""); //remove the commas that appeared as a result of cutting the string into multiple elements in an array.
  computerMove = position % 8;
  informedMove = true; //tell the function that you have found and rolled an informedMove.
}

function layoutDisplay(){ //function to create the display of the layout/state of the board. This formats the string in such a way that makes it easier for the player to understand.
  var layoutArray = layout.split("#"); //split the layout string by the "#" and add them to an array.
  layoutArray.shift();
  var row1 = layoutArray[0].split('').join(' '); //assign the first row (which is the first element in the array) to the variable "row1" and add a space in between each E.
  var row2 = layoutArray[1].split('').join(' '); //assign the first row (which is the second element in the array) to the variable "row2" and add a space in between each E.
  var row3 = layoutArray[2].split('').join(' '); //assign the first row (which is the first element in the array) to the variable "row3" and add a space in between each E.
  var row4 = layoutArray[3].split('').join(' '); //assign the first row (which is the first element in the array) to the variable "row4" and add a space in between each E.
  var row5 = layoutArray[4].split('').join(' '); //assign the first row (which is the first element in the array) to the variable "row5" and add a space in between each E.
  var row6 = layoutArray[5].split('').join(' '); //assign the first row (which is the first element in the array) to the variable "row6" and add a space in between each E.
  var hashRow = "############" //this just makes the next line slightly more attractive.
  displayFormat = hashRow + '\n\n\\# 1 2 3 4 5 6 7 #\n\n' + hashRow + '\n\n\\# ' + row1 + ' #\n\n\\# ' + row2 + ' #\n\n\\# ' + row3 + ' #\n\n\\# ' + row4 + ' #\n\n\\# ' + row5 + ' #\n\n\\# ' + row6 + ' #\n\n' + hashRow + '\n\n\n\n\ E = Empty Space \n\n\ Y = Yellow discs (Player) \n\n R = Red disc (Computer)';
  //defines the layout of the game so it is formatted in a way in which the user can clearly see the board state.
}
