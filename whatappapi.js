import axios from "axios";



export async function WhatsappResponse(phone_number,msg){
    const {data} = await axios.post('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    "integrated_number": process.env.WHATSAPP_INTEGRATED_NUMBER,
    "content_type": "template",
    "payload": {
        "messaging_product": "whatsapp",
        "type": "template",
        "template": {
            "name": "response_from_server_2",
            "language": {
                "code": "en",
                "policy": "deterministic"
            },
            "namespace": "329a6d81_daa5_4230_b0f3_c953f5f75b28",
            "to_and_components": [
                {
                    "to": [
                        phone_number
                    ],
                    "components": {
                        "body_value_1": {
                            "type": "text",
                            "value": msg,
                            "parameter_name": "value_1"
                        }
                    }
                }
            ]
        }
    }
    
  }, {
    headers: {
      'Content-Type': 'application/json',
      'authkey': process.env.MSG91_TOKEN
    }
    
})

console.log(data)
return data

}


