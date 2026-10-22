const express = require('express')
const dotenv = require('dotenv')
const { Webhook } = require('svix')
const bodyParser = require('body-parser')
const { exec, execFile } = require('child_process')
const { Resend } = require('resend')

const app = express()
dotenv.config()
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/',(req, res, next) => {
    res.send(`Webhook server active on port ${process.env.WEBHOOK_SERVER_PORT}`)
})
app.post('/deploy', bodyParser.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
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
  		exec("~/darry/apps/Portfolio-Webhook-Server/scripts/deploy-portfolio.sh", { timeout : 5 * 60 * 1000 }, async (err, stdout, stderr) => {
    			if (err) {
				console.error("Deploy failed. Invoking Agentic Doctor...");
				execFile('bash', [
					'/data/data/com.termux/files/home/darry/apps/sentinel/scripts/doctor.sh',
					String(err.message || err),
					String(msg.commit || 'unknown'),
					String(stderr || '')
				], async (docErr, docStdout, docStderr) => {
					const doctorRecovered = !docErr;
					const subject = doctorRecovered ? `Autonomous Self-Healing: Deploy Restored (${msg.commit || 'main'})` : `Build and Deploy Error (Auto-Triage Recorded)`;
					const statusBadge = doctorRecovered ? `<span style="color:#10b981;font-weight:bold;">HEALED AUTONOMOUSLY</span>` : `<span style="color:#ef4444;font-weight:bold;">ATTENTION REQUIRED</span>`;
					try {
						await resend.emails.send({
							from: 'Darryl <help@darrylmathias.tech>',
							to: ['darrylnevmat@gmail.com', 'darrylmathias04@gmail.com'],
							subject,
							html: `
								<h2>${subject}</h2>
								<p><strong>Status:</strong> ${statusBadge}</p>
								<p><strong>Commit:</strong> ${msg.commit || 'unknown'}</p>
								<h4>Initial Error:</h4>
								<pre style="background:#18181b;color:#f43f5e;padding:12px;border-radius:6px;overflow:auto;">${err}</pre>
								<h4>Agentic Doctor Output:</h4>
								<pre style="background:#18181b;color:#a1a1aa;padding:12px;border-radius:6px;overflow:auto;">${docStdout || docStderr || 'Doctor diagnostics completed.'}</pre>
							`
						});
					} catch (mailErr) {
						console.error("Failed to send doctor mail:", mailErr);
					}
				});
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
const PORT = process.env.WEBHOOK_SERVER_PORT || 5000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Webhook server active on 127.0.0.1:${PORT}`);
});
