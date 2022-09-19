import {compileFunc, compilerVersion, SuccessResult, ErrorResult} from '../src/index';
import fs from 'fs';
import {Cell} from 'ton';

describe('ton-compiler', () => {
    const walletCodeCellHash = Buffer.from("hA3nAz+xEJePYGrDyjJ+BXBcxSp9Y2xaAFLRgGntfDs=", 'base64');

    const compilerVersionExpected = {
        funcVersion: "0.2.0",
        funcFiftLibCommitHash: "2cbca16527b36a9e96f86f414699c2fe6346b64c",
        funcFiftLibCommitDate: "2022-09-19 15:07:14 +0700"
    }

    it('should return compiler version', async () => {
        let version = await compilerVersion();
        expect(version).toEqual(compilerVersionExpected);
    });

    it('should compile', async () => {
        let result = await compileFunc({
            optLevel: 2,
            entryPoints: ["stdlib.fc", "wallet-code.fc"],
            sources: {
                "stdlib.fc": fs.readFileSync('./test/contracts/stdlib.fc', { encoding: 'utf-8' }),
                "wallet-code.fc":  fs.readFileSync('./test/contracts/wallet-code.fc', { encoding: 'utf-8' })
            }
        });

        expect(result.status).toEqual('ok');
        result = result as SuccessResult;

        let codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
        expect(codeCell.hash().equals(walletCodeCellHash)).toBe(true)
    });

    it('should handle includes', async () => {
        let result = await compileFunc({
            optLevel: 2,
            entryPoints: ["wallet-code.fc"],
            sources: {
                "stdlib.fc": fs.readFileSync('./test/contracts/stdlib.fc', { encoding: 'utf-8' }),
                "wallet-code.fc":  fs.readFileSync('./test/contracts/wallet-code-with-include.fc', { encoding: 'utf-8' })
            }
        });

        expect(result.status).toEqual('ok');

        result = result as SuccessResult;

        let codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
        expect(codeCell.hash().equals(walletCodeCellHash)).toBe(true)
    });

    it('should fail if entry point source is not provided', async () => {
        expect(compileFunc({
            optLevel: 2,
            entryPoints: ["main.fc"],
            sources: {
            }
        })).rejects.toThrowError('The entry point main.fc has not provided in sources.');
    });

    it('should handle pragma', async () => {
        let source = `
            #pragma version ^${compilerVersionExpected.funcVersion};
            
            () main() { return(); }
        `
        let result = await compileFunc({
            optLevel: 1,
            entryPoints: ["main.fc"],
            sources: {
                "main.fc": source,
            }
        });

        expect(result.status).toEqual('ok')

        source = `
            #pragma version <${compilerVersionExpected.funcVersion};
            
            () main() { return(); }
        `
        result = await compileFunc({
            optLevel: 1,
            entryPoints: ["main.fc"],
            sources: {
                "main.fc": source,
            }
        });

        expect(result.status).toEqual('error')
        result = result as ErrorResult;
        expect(result.message.indexOf(`FunC version ${compilerVersionExpected.funcVersion} does not satisfy condition <0.2.0`) != undefined);
    })
});