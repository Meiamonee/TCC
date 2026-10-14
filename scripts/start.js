const { spawn } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const services = [
    {
        name: 'backend',
        cwd: path.join(rootDir, 'backend'),
        args: ['run', 'dev'],
        url: 'http://localhost:3001',
        // O proxy do Vite espera a API na 3001; um PORT herdado do ambiente nao pode mudar isso.
        env: { PORT: process.env.BACKEND_PORT || '3001' }
    },
    {
        name: 'frontend',
        cwd: path.join(rootDir, 'frontend'),
        args: ['run', 'dev'],
        url: 'http://localhost:5173'
    }
];

const children = [];
let shuttingDown = false;

function pipeWithPrefix(readable, writable, prefix) {
    let buffered = '';
    readable.setEncoding('utf8');

    readable.on('data', (chunk) => {
        buffered += chunk;
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop();

        for (const line of lines) {
            if (line.length > 0) {
                writable.write(`${prefix} ${line}\n`);
            }
        }
    });

    readable.on('end', () => {
        if (buffered.length > 0) {
            writable.write(`${prefix} ${buffered}\n`);
        }
    });
}

function killChild(child) {
    if (!child.pid || child.exitCode !== null || child.killed) {
        return;
    }

    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true
        });
        return;
    }

    try {
        process.kill(-child.pid, 'SIGTERM');
    } catch (_error) {
        child.kill('SIGTERM');
    }
}

function shutdown(exitCode = 0) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log('\nEncerrando backend e frontend...');

    for (const child of children) {
        killChild(child);
    }

    setTimeout(() => {
        process.exit(exitCode);
    }, 800).unref();
}

function startService(service) {
    const command = process.platform === 'win32'
        ? process.env.ComSpec || 'cmd.exe'
        : 'npm';
    const args = process.platform === 'win32'
        ? ['/d', '/s', '/c', `npm ${service.args.join(' ')}`]
        : service.args;

    const child = spawn(command, args, {
        cwd: service.cwd,
        env: { ...process.env, ...service.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
        windowsHide: true
    });

    children.push(child);

    pipeWithPrefix(child.stdout, process.stdout, `[${service.name}]`);
    pipeWithPrefix(child.stderr, process.stderr, `[${service.name}]`);

    child.on('error', (error) => {
        console.error(`[${service.name}] Falha ao iniciar: ${error.message}`);
        shutdown(1);
    });

    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }

        const reason = signal ? `sinal ${signal}` : `codigo ${code}`;
        console.error(`[${service.name}] encerrou com ${reason}.`);
        shutdown(code || 1);
    });
}

console.log('Iniciando backend e frontend...');
for (const service of services) {
    console.log(`- ${service.name}: ${service.url}`);
}
console.log('Use Ctrl+C para encerrar tudo.\n');

for (const service of services) {
    startService(service);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
