//Require packages
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const passportLocalMongoose = require('passport-local-mongoose');
const ejs = require('ejs');
const app = express();

/*
**********************************Configuration**************************************
 */

//Use middleware
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

//Configure Session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

//Use flash messages
app.use(flash());

//Intialize Session
app.use(passport.initialize());
app.use(passport.session());

//Get mongo username and password
DB_USERNAME = process.env.DB_USER;
DB_PASSWORD = process.env.DB_PASS;

//MongoDB Connection
//Replace database string with - mongodb://localhost:27017/YOUR_DB_NAME
mongoose.connect(`mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@cluster0-bxkcc.mongodb.net/listCreator`, {useNewUrlParser: true,useUnifiedTopology: true, useFindAndModify: false});
const db = mongoose.connection; 

//check connection to DB
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', (err) => {
    if(err){
        console.log(err);
    } else {
        console.log('connected to the database..');
    }  
});

//Schema for user list items
const listSchema = new mongoose.Schema({
    item: String,
})

//user schema for database
const userSchema = new mongoose.Schema ({
  name: String,
  dob: Date,
  age: Number,
  isAdmin: {type: Boolean, default: false},
  email: String,
  username: String,
  password: String,
  listItems: [listSchema]
});



//plugin for passport authentication
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const List = mongoose.model('List', listSchema);

//Session configuration
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'Please login first!');
        res.redirect('/login');
    }
}

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

/*
**********************************Routes**************************************
 */

//Home route
app.route('/')

.get((req, res) => {
    //render the home page
    res.render('index');
});

//Sign Up page
app.route('/signup')

.get((req, res) => {
    //render the signup form
    res.render('signup');
})

.post((req, res) => {
    //check if user email already exists
    User.findOne({ email: req.body.email }, (err, foundUser, done) => {
        //check for errors
        if(err){
            //log errors if any
            console.log(err);
        } if(foundUser) {//check for existing user
            //redirect to login if user exists
            req.flash('error','The given email already exists');
            res.redirect('/signup');
        } else { //otherwise register user as a new user
            var newUser = new User({
                name: req.body.name,
                dob: req.body.dob,
                age: req.body.age,
                email: req.body.email,
                username: req.body.username,
            });
            User.register(newUser, req.body.password, (err, user) =>{
                if(err){ //check for error and redirect if any
                   req.flash('error',"Your account could not be saved.");
                   res.redirect('/signup')
                } else { //otherwise show success message
                    req.flash('success',"Your account has been saved");
                    res.redirect('/login');
                }
            });
        }
    });
})

//Login route
app.route('/login')

.get((req, res) => {
    res.render('login');
})

.post((req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    //login user
    req.login(user, (err) => {
        if(err){ //if error in login redirect to login
            req.flash('error','Not able to sign in! Please try again');
            res.redirect('/login');
        } else { //otherwise autheticate the user
            passport.authenticate('local')(req, res, ()=>{
                User.findOne({username: user.username}, (err, foundUser) => {
                    if(!err && foundUser.isAdmin){
                        req.flash('success', 'Successfully logged in as Admin');
                        res.redirect('/adminpanel');
                    } else {
                        req.flash('success', `Successfully logged in as ${user.username}`);
                        res.redirect('/list/' + user.username);
                    }
                })                
            });
        }
    });
});

//Logout route
app.route('/logout')
.get((req, res) => {
  req.logout();
  //show success message and redirect to home page
  req.flash('success', 'Sucessfully logged out');
  res.redirect('/');
});

//List route
app.route('/list/:username')

.get(isLoggedIn, (req, res) => {
    const userName = req.params.username;
    //find user
    User.findOne({username: userName}, (err, foundUser) => {
        //check for errors
        if(err) {
            console.log(err);
        } else {
            //render the list items of no error
            res.render('list', {username: req.params.username, userList: foundUser.listItems });
        }
    })
    
})

.post((req, res) => {
    //get user
    const userName = req.params.username;
    //get new item and create the object
    const newItem = new List({
        item: req.body.item,
    });
    //find user
    User.findOne({username: userName}, (err, foundUser) => {
        //check for error in adding the new item
        if(err) {
            console.log(err);
            req.flash('error','Item was not saved');
            res.redirect('back');
        } else {
            //if no error push the new item into array
            foundUser.listItems.push(newItem);
            foundUser.save();
            console.log('Item saved');
            req.flash('success','Item Saved');
            res.redirect('/list/'+userName);
        }
    })
})

//Delete route
app.route('/list/:username/:listItemID')

.post(isLoggedIn,(req, res) => {
    //get user from params
    const user = req.params.username;
    //get item id from params
    const listItemID = req.params.listItemID;

    //delete the item using item id
    User.findOneAndUpdate({username: user}, { $pull: {listItems: {_id: listItemID}}}, (err, foundList) => {
        //If deleted without errors flash message and redirect
        if(!err) {
            req.flash('success','Item Deleted');
            res.redirect('/list/'+user);
        } else { //otherwise redirect
            req.flash('error','Not able to delete')
            res.redirect('back');
        }
    })
});

//Admin
app.route('/adminpanel')

.get(isLoggedIn, (req, res) => {
    //check if current user is admin or not
    if(req.user.isAdmin == true){
        //render the admin panel with non admin users
        User.find({isAdmin: false}, (err , users) => {
            if(!err) {
                res.render('adminPanel', {users: users})
            } else {
                req.flash('error','Not able to find users');
                req.logout();
                res.redirect('/login')
            }
        })
    } else {//otherwise redirect to login page
        req.flash('error', 'You need to be an admin!')
        res.redirect('/login');
    }    
})


app.listen(process.env.PORT || 3000, ()=> {
    console.log('Server started');
});