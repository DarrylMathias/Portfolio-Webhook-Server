const express = require('express')
const dotenv = require('dotenv')
const { Webhook } = require('svix')
const bodyParser = require('body-parser')
const { exec } = require('child_process')
const { Resend } = require('resend')

const app = express()
dotenv.config()
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/',(req, res, next) => {
    res.send(`Webhook server active on port ${process.env.WEBHOOK_SERVER_PORT}`)
})
app.post('/deploy', bodyParser.raw({ type: 'application/json' }), async (req, res, next) => {
	try{
		const payload = req.body;
    		const headers = req.headers;

    		const wh = new Webhook(process.env.WEBHOOK_SECRET);
    		let msg;
    		try {
        		msg = wh.verify(payload, headers);
    		} catch (err) {
        		return res.status(400).send('Invalid webhook body');
    		}
		console.log('Received data : ', msg);
		if (msg.type !== 'github.push') {
  			return res.status(200).send('Ignored event');
		}

		if (msg.branch !== "main")
    			return res.status(200).send(`Ignored branch : ${msg.data.branch}`);

		res.status(200).send('Deploy started')
  		exec("bash /data/data/com.termux/files/home/scripts/deploy/deploy-portfolio.sh", { timeout : 5 * 60 * 1000 }, async (err, stdout, stderr) => {
    			if (err) {
				const { data, error } = await resend.emails.send({
		                        from: 'Darryl <help@darrylmathias.tech>',
		                        to: ['darrylnevmat@gmail.com'],
		                        subject: `New Build and Deploy Error`,
		                        html: `
		                                <h2>Failed New Deploy</h2>
		                                <h4><strong>Error:</strong><br><br>${err}<br></h4>
		                        `
		                });
				if(data)	console.log(data);
      				console.error(err);
      				return; 
    			}
			const { data, error } = await resend.emails.send({
           			from: 'Darryl <help@darrylmathias.tech>',
            			to: ['darrylnevmat@gmail.com'],
            			subject: `New Build and Deploy Success`,
            			html: `
                			<h2>New Deploy</h2>
                			<strong>Commit:</strong> ${msg.commit}<br>
            			`
        		});
			if(data)	console.log(data);
    			console.log(stdout);
 	 	});
	}catch(err){
		const { data, error } = await resend.emails.send({
            		from: 'Darryl <help@darrylmathias.tech>',
            		to: ['darrylnevmat@gmail.com'],
            		subject: `New Build and Deploy Error`,
            		html: `
                		<h2>Failed New Deploy</h2>
                		<h4><strong>Error:</strong><br><br>${err}<br></h4>
            		`
        	});
		if(data)	console.log(data);
		console.log(`Error : ${err}`);
		res.status(400).send('Unknown error');
	}
})
app.listen(process.env.WEBHOOK_SERVER_PORT);
