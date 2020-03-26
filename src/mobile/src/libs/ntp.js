import ntpClient from 'react-native-ntp-client';

/**
 *   Gets the time from an ntp server
 *
 *   @method getTime
 *
 *   @returns {(Promise<number>|boolean)}
 **/
const getTime = async () => {
    return new Promise((resolve) => {
        ntpClient.getNetworkTime('pool.ntp.org', 123, (error, date) => {
            if (error) {
                return false;
            }
            return resolve(new Date(date).getTime());
        });
    });
};

export default getTime;
