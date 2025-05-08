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
        this.data[processid] = {
            ...this.data[processid],
            ...data
        };
    }

    
}

let statusInstance = new Status();
export default statusInstance;