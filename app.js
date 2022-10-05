require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const dbName = "projectManagerDB";

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "process.env.DB_SEC",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize()); // initialize passport
app.use(passport.session()); // use passport to set up sessions // see passportjs.org

const uri =
  "mongodb+srv://" +
  username +
  ":" +
  password +
  "@0selflearningnodejs.fyag25c.mongodb.net/" +
  dbName +
  "?retryWrites=true&w=majority";
mongoose.connect(uri);

const departmentSchema = mongoose.Schema({
  name: String,
  // Id: String,
});

const userSchema = mongoose.Schema({
  username: String,
  password: String,
  // userId: String,
  department: departmentSchema,
  isAdmin: Boolean,
});
userSchema.plugin(passportLocalMongoose); // hash and salt password

departmentSchema.add({ manager: userSchema });

const projectSchema = mongoose.Schema({
  name: String,
  logo: String,
  url: String,
  state: Boolean,
  department: departmentSchema,
  majorStaff: [userSchema],
  technicalStaff: [userSchema],
});

const Department = mongoose.model("Department", departmentSchema);
const User = mongoose.model("User", userSchema);
const Project = mongoose.model("Project", projectSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const defaultDepartments = [
  { name: "depart A" },
  { name: "depart B" },
  { name: "depart C" },
];

// do things

app.get("/", (req, res) => {
  // insert admin user
  User.register({ username: "admin" }, "admin", (err, newUser) => {
    if (err) {
      console.log(err);
      res.render("register", { alert: "" });
    } else {
      User.findOneAndUpdate({ username: "admin" }, { isAdmin: true }, (err) => {
        console.log(err);
      });
    }
  });
  // insert default department
  Department.findOne({}, (err, foundDepartment) => {
    if (err) {
      console.log(err);
    } else {
      if (!foundDepartment) {
        Department.insertMany(defaultDepartments, (err) => {
          console.log(err);
        });
      }
    }
  });
  

  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  Department.find({}, (err, foundDepartments) => {
    if (!err) {
      res.render("register", { alert: "", departments: foundDepartments });
    }
  });
});

app.get("/admin", (req, res) => {
  Project.find({}, (err, foundProjects) => {
    User.find({}, (err, foundUsers) => {
      if (req.isAuthenticated()) {
        console.log(foundProjects);
        console.log(foundUsers);
        res.render("admin", {
          userInfor: req.user,
          projects: foundProjects,
          users: foundUsers,
        });
      } else {
        res.redirect("/login");
      }
    });
  });
});

app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    // console.log(req);
    // User.findOne({req.body.username})
    res.render("user", { userInfor: req.user });
  } else {
    res.redirect("/login");
  }
});

// -------------------------------------

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, newUser) => {
      if (err) {
        console.log(err);
        Department.find({}, (err, foundDepartments) => {
          if (!err) {
            res.render("register", {
              alert: "",
              departments: foundDepartments,
            });
          }
        });
      } else {
        Department.findOne(
          { name: req.body.department },
          (err, foundDepartment) => {
            if (!err) {
              User.findOneAndUpdate(
                { username: req.body.username },
                {
                  department: foundDepartment,
                  isAdmin: false,
                },
                () => {}
              );
            }
            passport.authenticate("local")(req, res, () => {
              res.redirect("/user");
            });
          }
        );
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  // come from passport
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        User.findOne({ username: user.username }, (err, foundUser) => {
          if (foundUser.isAdmin === true) {
            res.redirect("/admin");
          } else {
            res.redirect("/user");
          }
        });
      });
    }
  });
});

// start server

app.listen(3000, function () {
  console.log("Server started on port 3000");
});

// 2562914af8709d1f777966c3892730960cd2bb4a
