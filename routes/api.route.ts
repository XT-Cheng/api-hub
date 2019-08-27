import { NextFunction, Request, Response, Router } from 'express';
import fetch from 'node-fetch';

export class APIRoute {
    private static portCount = 0;
    private static ports: string[] = [];
    private static host: string;

    public static executeBAPI(dialog: string) {
        return fetch(`${APIRoute.getEndPoint()}/bapi`,
            {
                method: 'POST',
                body: JSON.stringify({ dialog: dialog }),
                headers: { 'Content-Type': 'application/json' }
            }).then(ret => {
                return ret.json();
            });
    }

    public static create(router: Router, ports: string[], host: string) {
        console.log('API route create');
        APIRoute.ports = ports;
        APIRoute.host = host;

        //Execute API
        router.post('/bapi', (req: Request, res: Response, next: NextFunction) => {
            APIRoute.execute(req, res, next);
        });
    }

    private static getEndPoint() {
        return `http://${APIRoute.host}:${APIRoute.ports[APIRoute.roundRobin()]}`;
    }

    private static roundRobin() {
        const now = APIRoute.portCount;
        const next = now % APIRoute.ports.length;
        APIRoute.portCount++;
        if (APIRoute.portCount > 10000) {
            APIRoute.portCount = 0;
        }
        return next;
    }

    private static execute(req: Request, res: Response, next: NextFunction) {
        fetch(`${APIRoute.getEndPoint()}/bapi`,
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