import { generateRamdomId } from "@/_serverfeatures/utils";

class Status {
    private data: any;

    constructor() {
        this.data = {};
    }

    updateData(data: any) {
        if(!data.status || !data.message){
            throw new Error("Status and message are required");
        }
        let processid = generateRamdomId();
        if(data.processId){
            processid = data.processId;
        }
        console.log(data);
        if(!this.data[processid]){
            this.data[processid] = [data];
        }else{
            this.data[processid] = [
            ...this.data[processid],
                data
            ];
        }
    }

    getData(processId: string) {
        // console.log({processId});
        console.log({data: this.data} , processId);
        return this.data[processId];
    }
    clearData(processId: string) {
        delete this.data[processId];
    }
}

let statusInstance = new Status();
export default statusInstance;