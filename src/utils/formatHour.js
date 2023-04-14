import dayjs from 'dayjs';

export default function formatHour(){
    return dayjs().format("HH:mm:ss");
}