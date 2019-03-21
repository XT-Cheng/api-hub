import { NextFunction, Request, Response, Router } from 'express';
import fetch from 'node-fetch';

export class FetchRoute {
    private static portCount = 0;
    private static ports: string[] = [];
    private static host: string;

    public static fetch(sql: string) {
        return fetch(`${FetchRoute.getEndPoint()}/fetch`,
            {
                method: 'POST',
                body: JSON.stringify({ sql: sql }),
                headers: { 'Content-Type': 'application/json' }
            }).then(ret => {
                return ret.json();
            });
    }

    public static create(router: Router, ports: string[], host: string) {
        console.log('Fetch route create');
        FetchRoute.ports = ports;
        FetchRoute.host = host;

        //Execute API
        router.post('/fetch', (req: Request, res: Response, next: NextFunction) => {
            FetchRoute.execute(req, res, next);
        });
    }

    private static getEndPoint() {
        return `http://${FetchRoute.host}:${FetchRoute.ports[FetchRoute.roundRobin()]}`;
    }

    private static roundRobin() {
        const now = FetchRoute.portCount;
        const next = now % FetchRoute.ports.length;
        FetchRoute.portCount++;
        if (FetchRoute.portCount > 10000) {
            FetchRoute.portCount = 0;
        }
        return next;
    }

    private static execute(req: Request, res: Response, next: NextFunction) {
        fetch(`${FetchRoute.getEndPoint()}/fetch`,
            {
                method: 'POST',
                body: JSON.stringify(req.body),
                headers: { 'Content-Type': 'application/json' }
            }).then(ret => {
                return ret.json();
            }).then(json => {
                res.json(json);
            }).catch(err => {
                console.log(err);
            });
    }
}