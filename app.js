const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const { response } = require('express');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
	debug: true
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
	// res.status(200).json({
	// 	status: true,
	// 	message: 'Hello World'
	// });
	res.sendFile('index.html', { root: __dirname });
});

//apabila tidak ingin menggunakan browser make headless nya  = true
const client = new Client({ 
	puppeteer: { 
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--no-first-run',
			'--no-zygote',
			'--single-process', // <- this one doesn't works in Windows
			'--disable-gpu'
		  ],
	}, 
	session: sessionCfg 
});

client.on('message', msg => {
    if (msg.body == 'halo') {
        msg.reply('apaa kabs babon anjim');
    }
});

client.initialize();

//socket io
io.on('connection', function(socket){
	socket.emit('message', 'Connecting...');
	client.on('qr', (qr) => {
	    // Generate and scan this code with your phone
	    console.log('QR RECEIVED', qr);
	    // qrcode.generate(qr);
	    qrcode.toDataURL(qr, (err, url) => {
	    	socket.emit('qr' , url);
	    	socket.emit('message', 'QR Code RECEIVED , scan please!');
	    });
	});

	client.on('ready', () => {
		socket.emit('ready', 'Whatsapp is ready !');
	    socket.emit('message', 'Whatsapp is ready !');
	});

	client.on('authenticated', (session) => {
		socket.emit('authenticated', 'Whatsapp is authenticated !');
	    socket.emit('message', 'Whatsapp is authenticated !');
	    console.log('AUTHENTICATED', session);
	    sessionCfg=session;
	    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
	        if (err) {
	            console.error(err);
	        }
	    });
	});
});

const checkRegisteredNumber = async function(number){
	const isRegistered = await client.isRegisteredUser(number);
	return isRegistered;
}

//send message
app.post('/send-message', [

	body('number').notEmpty(),
	body('message').notEmpty(),

	] , async (req, res) => {
	const errors = validationResult(req).formatWith(({msg}) => {
		return msg;
	});

	if (!errors.isEmpty()){
		return res.status(422).json({
			status: false,
			message: errors.mapped()
		})
	}
	const number = phoneNumberFormatter(req.body.number);
	const message = req.body.message;

	const isRegisteredNumber = await checkRegisteredNumber(number);
	if(!isRegisteredNumber){
		return res.status(422).json({
			status: false,
			message: 'The number is not registered'
		});
	}

	client.sendMessage(number, message).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

//send media
app.get('/send-test/:nomor/:message', (req, res) => {

	const test = phoneNumberFormatter(req.params.nomor);
	const testmes = req.params.message;

	client.sendMessage(test, testmes).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
	
});

//send media
app.post('/send-media', async (req, res) => {
	
	const number = phoneNumberFormatter(req.body.number);
	const caption = req.body.caption;
	const fileUrl = req.body.file;

	// const media = MessageMedia.fromFilePath('./testis.jpg');
	// const file = req.files.file;
	// const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
	let mimetype;
	const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then(response => {
		mimetype = response.headers['content-type'];
		return response.data.toString('base64');
	});

	const media = new MessageMedia(mimetype, attachment , 'Mediakung');

	client.sendMessage(number, media , { caption: caption }).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

server.listen(2002, function() {
	console.log('app running on *: ' + 2002);
});