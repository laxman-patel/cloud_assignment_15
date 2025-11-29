import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '10s', target: 0 },
    ],
};

export default function () {
    const res = http.get('http://aaa4c4d2d5dc746ae99284ee17ea76c1-1532157829.us-east-1.elb.amazonaws.com/'); // web frontend
    check(res, { 'status was 200': (r) => r.status == 200 });
    sleep(1);
}
