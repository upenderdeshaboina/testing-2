const express= require('express')
const path= require('path')
const {open}= require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt= require('bcrypt')
const jwt= require('jsonwebtoken')
const cors= require('cors')
const {v4:uuidv4}= require('uuid')

const app = express()

app.use(express.json())
app.use(cors())

const dbFile= path.join(__dirname, 'users.db')
let db

const initiatServer= async ()=>{
    try{
        db= await open({
            filename: dbFile,
            driver: sqlite3.Database
        })
    }catch(e){
        console.log(`Server Error: ${e.message}`)
        process.exit(1)
    }
}
initiatServer()

/*app.get("/fetch-companies", async (req, res) => {
    const {offset}=req.query
    try {
      const response = await axios.get(
        `https://marketstack.com/stock_api.php?offset=${offset}&exchange=XNSE&search=`
      );
      if(response.data.data){
        const query=`insert into companies_stocks(name,ticker,exchange) values(?,?,?)`
        const connection = await pool.getConnection();
        for (let i of response.data.data){
          const symbol=i.symbol.split('.')[0]
          await connection.execute(query,[i.name,symbol,'NSE'])
        }
        connection.release()
        res.status(201)
        res.send({message:'stocks of companies stored.'})
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "An error occurred while fetching companies" });
    }
});*/

app.get('/fetch-data', async (req, res)=>{
    const {offset}= req.query 
        const response= await fetch(`https://marketstack.com/stock_api.php?offset=${offset}&exchange=XNSE&search=`)
    const query=`
        Insert into companies_stocks(name, ticker, exchange) values(?,?,?);
    `
    const data=await response.json()
    for (let i of data.data){
        const symbol= i.symbol.split('.')[0]
        await db.run(query,[i.name, symbol, 'NSE'])
    }
    res.status(201).json({message: 'stocks of companies stored.'})
    
})

// users table
app.get('/api/users/', async (req, res)=>{
    const sqlGet= `SELECT * FROM users;`
    const usersTable= await db.all(sqlGet)
    res.status(200).send(usersTable)
})

// user registration
app.post('/api/signup/', async (req, res)=>{
    const {username, email ,password}= req.body 
    //console.log(uuidv4())
    const id= uuidv4()
    if (username.length === 0){
        res.json({message: 'please enter username'})
    }else if (email.length === 0){
        res.json({message: 'please enter email address'})
    }else{
        const hashedPassord = await bcrypt.hash(password, 10)
        const sqlgetUser= `SELECT * FROM users where email= '${email}'`
        const userData= await db.get(sqlgetUser)
        if (userData === undefined){
            const createSQL= `INSERT INTO users (id, name, email, password) 
                    VALUES ('${id}', '${username}', '${email}', '${hashedPassord}');`
            db.run(createSQL)
            res.status(200).json({message: 'User signned up Successfully'})
        }else{
            res.status(400).json({message: 'User already Registered, Please signin'})
        }
    }
    
    
})

// delete a specific user
app.delete('/api/users/:id', async (req, res)=>{
    const {id}= req.params
    const deleteSQL= `DELETE FROM users WHERE id =${id};`
    await db.run(deleteSQL)
    res.status(200).send('row deleted')
})

// user login
app.post('/api/signin/', async (req, res)=>{
    const {email, password}= req.body 
    const sqlgetUsersign= `SELECT * FROM users where email='${email}'`
    const userDatasign= await db.get(sqlgetUsersign)
    if (userDatasign === undefined){
        res.status(400).json({message: 'invaid username, please signup'})
    }else{
        const comparepass= await bcrypt.compare(password , userDatasign.password)
        if (comparepass === true){
            const token = jwt.sign(
                { id: userDatasign.id, username: userDatasign.username, email: userDatasign.email },
                'MY_SECRET_KEY',
              );
            res.status(200).json({message: 'user signin success', token})
        }else{
            res.status(400).json({message: 'invalid password'})
        }
    }
    
})

app.listen(3007, ()=>{
    console.log('Server is running at http://localhost:3007')
});
