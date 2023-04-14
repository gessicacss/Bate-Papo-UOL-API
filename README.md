# BATE-PAPO UOL API

## About

This is a simple chat API built with Node.js and MongoDB, based on a brazilian chatroom. The API allows users to register as participants and send messages to each other. Users can also update their last status, and get a list of all messages and participants.

## Technologies

<p align='center'>
<img style='margin: 2px;' src='https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white'/>
<img style='margin: 2px;' src='https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black'/>
<img style='margin: 2px;' src='https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB'/>
<img style='margin: 2px;' src='https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=wbhite/'>
<img style='margin: 2px; width:70px' src='https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white/'>
</p>

## Routes

#### <span style='font-weight:bold;'>POST</span> /participants

A route to create a register a new user. If there's a participant with this name already, it'll return a 409 status code error. If its sucessfull you'll get a 201 status code. The request body should be:

```
{
  "name": "John Doe"
}
```

#### <span style='font-weight:bold;'>GET</span> /participants

A route that will retrieve a list of all the participants in the chat. The response will come like that:

```
[  
    {
    "name": "John Doe",
    "lastStatus": "2023-04-14T01:28:38.974Z"  
    },
    {
    "name": "Jane Smith",
    "lastStatus": "2023-04-14T02:10:12.441Z"  
    }
]
```

#### <span style='font-weight:bold;'>POST</span> /messages

A request to create new messages. All the fields are required and can't be empty. The username should come as a header. If any of the fields are missing or empty, the API will respond with a 400 status code and an error message indicating that all the fields are required and shouldn't be empty. It'll return a 422 status code if the sender is not on the participants list.

```
The header should be like this:
	{
		user: "username"
	}
```

```
While the request body should be:
    {
        "to": "Todos",
        "text": "Hello, everyone!",
        "type": "message"
    }
```

#### <span style='font-weight:bold;'>GET</span> /message

A request that will retrieve a list of messages in the chat. If there are no tweets, it'll return an empty array. The response will come like this:

```
The time format is meant to be: (HH:mm:ss)
[
	{
        "from": "John Doe",
        "to": "Todos",
        "text": "Hello, everyone!",
        "type": "message",
        "time": "21:35:10" 
	},
	{
        "from": "Jane Smith",
        "to": "John Doe",
        "text": "Hi John!",
        "type": "message",
        "time": "21:37:05"
	}
]
```

#### <span style='font-weight:bold;'>POST</span> /status

A request that will update the last status of a participant. It'll return a 404 status code if the participant isn't on the list of participants.

```
The header should be like this:
{
  "user": "John Doe"
}
```

## How to run

To run this project, you'll have to install MongoDB to acess the database.

1. Clone this repository
2. Install the dependencies

```
npm i
```

3. Create a **.env** file in the root directory of the project and add the necessary environment variables. This file should not be committed to GitHub for security reasons. It should look like this:

```
DATABASE_URL=mongodb://localhost:27017/batePapoUol
```

4. Run the back-end with

```
npm start
```

4. Access http://localhost:5000 on your browser to run the API.
