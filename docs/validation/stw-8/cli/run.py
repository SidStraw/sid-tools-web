#!/usr/bin/env python3
"""Daemon-free, synthetic-only Compose config evidence. No third-party modules."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
BINARY = Path('/usr/local/bin/docker-compose')
PROJECT = 'stw8oracle'
FLAGS = ['config', '--format', 'json', '--no-interpolate',
         '--no-env-resolution', '--no-path-resolution']
MAX_OUTPUT = 65536


def main():
    # env -i equivalent: no inherited environment entries, no Docker plugin lookup.
    with tempfile.TemporaryDirectory(prefix='stw8-cli-') as temporary:
        sandbox = Path(temporary)
        home = sandbox / 'home'
        config = sandbox / 'docker-config'
        home.mkdir()
        config.mkdir()
        env = {'PATH': '/usr/bin:/bin', 'HOME': str(home),
               'DOCKER_CONFIG': str(config), 'COMPOSE_DISABLE_ENV_FILE': '1',
               'COMPOSE_ANSI': 'never', 'NO_COLOR': '1', 'LANG': 'C', 'LC_ALL': 'C'}

        def run(args, cwd):
            command = [str(BINARY), *args]
            try:
                completed = subprocess.run(command, cwd=cwd, env=env, capture_output=True,
                                           timeout=20, check=False)
                stdout, stderr = completed.stdout, completed.stderr
                if len(stdout) + len(stderr) > MAX_OUTPUT:
                    raise RuntimeError('Evidence output exceeded 64 KiB; not recorded')
                return {'command': command, 'exitCode': completed.returncode,
                        'stdout': stdout.decode('utf-8'), 'stderr': stderr.decode('utf-8')}
            except subprocess.TimeoutExpired as error:
                raise RuntimeError('Compose command exceeded 20 seconds') from error

        version = run(['version'], sandbox)
        if version['exitCode'] != 0 or version['stdout'].strip() != 'Docker Compose version v5.5.0':
            raise RuntimeError('Expected installed official Docker Compose v5.5.0')
        help_result = run(['config', '--help'], sandbox)
        for flag in FLAGS[3:]:
            if flag not in help_result['stdout']:
                raise RuntimeError('Required config flag absent: ' + flag)
        metadata = {'executable': str(BINARY), 'sha256': hashlib.sha256(BINARY.read_bytes()).hexdigest(),
                    'version': version, 'configHelp': help_result,
                    'environment': {**env, 'HOME': '<fresh>/home', 'DOCKER_CONFIG': '<fresh>/docker-config'},
                    'timeoutSecondsPerCommand': 20, 'maxOutputBytesPerCommand': MAX_OUTPUT}
        cases = sorted((ROOT / 'fixtures').glob('*.yaml'))
        if len(cases) > 32:
            raise RuntimeError('Fixture count exceeds bound')
        results = []
        for fixture in cases:
            work = sandbox / fixture.stem
            work.mkdir()
            shutil.copyfile(fixture, work / 'compose.yaml')
            for support in sorted((ROOT / 'fixtures' / 'support').glob('*.yaml')):
                shutil.copyfile(support, work / support.name)
            args = ['--project-name', PROJECT, '--file', 'compose.yaml', *FLAGS]
            if fixture.stem == '21-profile-active':
                args = ['--profile', 'database', *args]
            modes = [('normal-consistency', [arg for arg in args if arg != '--no-interpolate']),
                     ('no-interpolate', args)]
            for mode, command_args in modes:
                record = {'case': fixture.stem, 'mode': mode, **run(command_args, work)}
                # macOS may canonicalize /var paths to /private/var paths.
                for stream in ['stdout', 'stderr']:
                    record[stream] = record[stream].replace(str(work.resolve()), '<fixture-dir>')
                    record[stream] = record[stream].replace(str(work), '<fixture-dir>')
                results.append(record)
        (ROOT / 'results.json').write_text(json.dumps({'metadata': metadata, 'results': results}, indent=2) + '\n')
        for result in results:
            print(f"{result['case']} [{result['mode']}]: exit {result['exitCode']}")
        print(f'{len(results)} actual config commands recorded; no daemon commands invoked.')


if __name__ == '__main__':
    main()
