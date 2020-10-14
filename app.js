require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const ejs = require('ejs');
const app = express();

//use modules
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

//Configure Passport
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

DB_USERNAME = process.env.DB_USER;
DB_PASSWORD = process.env.DB_PASS;


//MongoDB Connection
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

const listSchema = new mongoose.Schema({
    item: String,
})

//user schema for database
const userSchema = new mongoose.Schema ({
  name: String,
  dob: Date,
  age: Number,
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

//Home route
app.route('/')

.get((req, res) => {
    res.render('index');
});

//Sign Up page
app.route('/signup')

.get((req, res) => {
    res.render('signup');
})

.post((req, res) => {
    //check if user email already exists
    User.findOne({ email: req.body.email }, (err, foundUser, done) => {
        //if yes
            //show error message
        if(err){
            console.log(err);
        } if(foundUser) {
            res.json({success: false, message:'The given email already exists'});
        } else {
            var newUser = new User({
                name: req.body.name,
                dob: req.body.dob,
                age: req.body.age,
                email: req.body.email,
                username: req.body.username,
            });
            User.register(newUser, req.body.password, (err, user) =>{
                if(err){
                   res.json({success:false, message:"Your account could not be saved. Error: ", err});
                } else {
                    res.json({success: true, message: "Your account has been saved"}) 
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

    req.login(user, (err) => {
        if(err){
            res.json({success: false, message:'Not able to sign in', err});
        } else {
            passport.authenticate('local')(req, res, ()=>{
                console.log(user);
                res.redirect('/list/' + user.username);
            });
        }
    });
});

//Logout route
app.route('/logout')
.get((req, res) => {
  req.logout();
  res.redirect('/');
});

//List route
app.route('/list/:username')

.get((req, res) => {
    const userName = req.params.username;

    User.findOne({username: userName}, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            res.render('list', {username: req.params.username, userList: foundUser.listItems });
        }
    })
    
})

.post((req, res) => {
    // console.log(req.params);
    // console.log(req.body);
    const userName = req.params.username;
    const newItem = new List({
        item: req.body.item,
    });

    User.findOne({username: userName}, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            console.log(foundUser);
            foundUser.listItems.push(newItem);
            foundUser.save();
            console.log('Item saved');
            res.redirect('/list/'+userName);
        }
    })
})

//Delete route
app.route('/list/:username/:listItemID')

.post((req, res) => {
    const user = req.params.username;
    const listItemID = req.params.listItemID;

    User.findOneAndUpdate({username: user}, { $pull: {listItems: {_id: listItemID}}}, (err, foundList) => {
        if(!err) {
            console.log('deleted');
            res.redirect('/list/'+user);
        } else {
            console.log('failed to delete');
        }
    })
})


app.listen(process.env.PORT || 3000, ()=> {
    console.log('Server started');
});