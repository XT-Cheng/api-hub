import * as bodyParser from 'body-parser';
import errorHandler = require('errorhandler');
import * as express from 'express';
import { createServer, Server } from 'http';
import * as logger from 'morgan';
import { concat, Observable } from 'rxjs';
import { APIRoute } from './routes/api.route';
import { FetchRoute } from './routes/fetch.route';
import { CheckListResultMonitor } from './jobs/checkList.result.monitor';

/**
 * The server.
 *
 * @class RestfulServer
 */
export class ApiHub {

    public app: express.Application;
    private port: any;
    private httpServer: Server

    private ports: string[] = [];
    private apiHost: string;

    /**
     * start the API Hub
     *
     * @class Server
     * @method start
     * @static
     * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
     */
    public start() {
        this.httpServer = createServer(this.app);

        //listen on provided ports
        this.httpServer.listen(this.port);

        //add error handler
        this.httpServer.on("error", this.onError);

        //start listening on port
        this.httpServer.on("listening", this.onListening.bind(this));
    }

    /**
     * Constructor.
     *
     * @class Server
     * @constructor
     */
    constructor() {
        //create expressjs application
        this.app = express();
        this.port = this.normalizePort(process.env.PORT || 3000);
        console.log(`PORT: ${this.port}`);

        this.ports = process.env.AVAILABLEPORTS ? process.env.AVAILABLEPORTS.split(`,`) : ['4000'];
        console.log(`AVAILABLEPORTS: ${this.ports}`);
        this.apiHost = process.env.APIHOST || `localhost`;
        console.log(`APIHOST: ${this.apiHost}`);

        console.log(`CheckList Monitor Interval: ${CheckListResultMonitor.EXECUTE_INTERVAL}`);

        concat(this.preRoute(), this.routes(), this.initState(), this.setupTimer(), this.postRoute()).subscribe(
            _ => {
                console.log("API Hub Initialized!");
            }, err => console.error(`API Hub start failed:${err}`)
        )
    }

    private preRoute(): Observable<void> {
        return Observable.create(observer => {
            //use logger middlware
            this.app.use(logger("dev"));
            //use json form parser middlware
            this.app.use(bodyParser.json());
            //CORS on ExpressJS
            this.app.use(function (req, res, next) {
                res.header("Access-Control-Allow-Origin", <string>req.headers['origin']);
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
                res.header('Access-Control-Allow-Credentials', 'true');
                next();
            });

            console.log("preRoute");
            observer.complete();
        })
    }

    private initState(): Observable<void> {
        return Observable.create(async observer => {
            CheckListResultMonitor.currentShift = await CheckListResultMonitor.getCurrentShift();
            console.log("initState");
            observer.complete();
        })
    }

    private setupTimer(): Observable<void> {
        return Observable.create(observer => {
            setTimeout(CheckListResultMonitor.execute, CheckListResultMonitor.EXECUTE_INTERVAL);
            console.log("setupTimer");
            observer.complete();
        })
    }

    private postRoute(): Observable<void> {
        return Observable.create(observer => {
            this.app.use(errorHandler());
            console.log("postRoute");
            observer.complete();
        })
    }

    private routes(): Observable<void> {
        let router: express.Router;

        return Observable.create(observer => {
            router = express.Router();

            //Route create
            APIRoute.create(router, this.ports, this.apiHost);
            FetchRoute.create(router, this.ports, this.apiHost);

            //use router middleware
            this.app.use(router);
            observer.complete();
        })
    }

    private normalizePort(val: any) {
        var port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }

        if (port >= 0) {
            // port number
            return port;
        }

        return false;
    }

    private onError(error) {
        if (error.syscall !== "listen") {
            throw error;
        }

        var bind = typeof this.port === "string"
            ? "Pipe " + this.port
            : "Port " + this.port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case "EACCES":
                console.error(bind + " requires elevated privileges");
                process.exit(1);
                break;
            case "EADDRINUSE":
                console.error(bind + " is already in use");
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    private onListening() {
        var addr = this.httpServer.address();
        var bind = typeof addr === "string"
            ? "pipe " + addr
            : "port " + addr.port;
        console.log("Listening on " + bind);
    }
}

new ApiHub().start();