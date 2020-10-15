# List Creator

A basic yet fully functional list creator(ToDo) with login and signup authentication features. See live [here](https://list-creator.herokuapp.com/)

## To-Do

- [x] Sign up form
- [x] Login form
- [x] Logouts
- [x] List Creator
- [x] Admin Grid
- [x] Routes

## Endpoints

- / - home
- /login - user login
- /signup - for new users
- /adminpanel - For checking users list
- /logout - to logout as current user
- /list/:username - dynamic route as per the user o check out list and add items to the list
- /list/:username/:listItemID - Delete route for items in list

## Things I Have Used

- NodeJS
- Express
- MongoDB
- Mongoose
- Flash messages
- PassportJS
- EJS
- HTML, CSS

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

```
 git clone https://github.com/pinnheads/list-creator.git
 cd into the directory
 npm install
 node app.js
```
